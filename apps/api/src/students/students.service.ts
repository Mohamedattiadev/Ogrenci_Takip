import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { Workbook } from 'exceljs';
import { UserRole, withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { STATUS_LABELS, summarize } from '../common/attendance-stats';
import { dateOnly, dayRange, formatDate, todayInTurkey } from '../common/dates';
import { withSavepoint } from '../common/db-helpers';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref } from '../common/lookups';
import { closeMemberships } from '../common/memberships';
import { contains, pageArgs, toPage } from '../common/pagination';
import { getReportExporter } from '../reports/exporters/report-exporter.factory';
import type {
  CreateStudentDto,
  DateRangeQueryDto,
  GroupTransferDto,
  StudentExportQueryDto,
  StudentQueryDto,
  UpdateStudentDto,
  WithdrawStudentDto,
} from './dto/create-student.dto';
import type { CreateStudentAccountDto, UpdateStudentAccountDto } from './dto/student-account.dto';
import { parseStudentSheet, type SheetRow } from './student-import';

const USERNAME = /^[a-z0-9._-]{3,40}$/;

const ACCOUNT_SELECT = {
  id: true,
  username: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const STUDENT_INCLUDE = {
  account: { select: { username: true, isActive: true, mustChangePassword: true } },
  scholarshipProgram: { select: { id: true, code: true, name: true } },
  memberships: {
    where: { effectiveTo: null, group: { deletedAt: null } },
    select: { effectiveFrom: true, group: { select: { id: true, name: true } } },
  },
} satisfies Prisma.StudentInclude;

type StudentRow = Prisma.StudentGetPayload<{ include: typeof STUDENT_INCLUDE }>;

const TEMPLATE_HEADERS = [
  'Öğrenci No',
  'Ad',
  'Soyad',
  'Cinsiyet',
  'Burs Programı',
  'Üniversite',
  'Bölüm',
  'Sınıf',
  'Telefon',
  'Veli Adı',
  'Veli Telefon',
  'Veli E-posta',
  'Kayıt Tarihi',
];

@Injectable()
export class StudentsService {
  list(user: AuthenticatedUser, query: StudentQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where = studentWhere(query);
      const [rows, total] = await Promise.all([
        tx.student.findMany({
          where,
          include: STUDENT_INCLUDE,
          orderBy: studentOrder(query.sort),
          ...pageArgs(query),
        }),
        tx.student.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.student.findFirstOrThrow({
        where: { id, deletedAt: null },
        include: STUDENT_INCLUDE,
      });
      const counts = await tx.attendanceRecord.groupBy({
        by: ['status'],
        where: { studentId: id },
        _count: { _all: true },
      });
      const [student] = await present(tx, [row]);
      return {
        ...student,
        attendance: summarize(counts.map((c) => [c.status, c._count._all] as const)),
      };
    });
  }

  create(user: AuthenticatedUser, dto: CreateStudentDto) {
    const institutionId = targetInstitution(user, dto.institutionId);
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.student.create({
        data: { ...dto, institutionId, enrollDate: dateOnly(dto.enrollDate) },
        include: STUDENT_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateStudentDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.student.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      const row = await tx.student.update({
        where: { id },
        data: { ...dto, ...(dto.enrollDate ? { enrollDate: dateOnly(dto.enrollDate) } : {}) },
        include: STUDENT_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  /** Yurttan ayrilma: aktif grup uyelikleri ayni tarihte kapatilir, gecmis korunur. */
  withdraw(user: AuthenticatedUser, id: string, dto: WithdrawStudentDto) {
    const date = dto.withdrawDate ? dateOnly(dto.withdrawDate) : todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({ where: { id, deletedAt: null } });
      if (student.withdrawDate) throw new ConflictException('Ogrenci zaten ayrilmis');
      if (date < student.enrollDate) {
        throw new BadRequestException('Ayrilma tarihi kayit tarihinden once olamaz');
      }
      await closeMemberships(tx, { studentId: id }, date);
      const row = await tx.student.update({
        where: { id },
        data: { withdrawDate: date },
        include: STUDENT_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  reinstate(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({ where: { id, deletedAt: null } });
      if (!student.withdrawDate) throw new ConflictException('Ogrenci zaten aktif');
      const row = await tx.student.update({
        where: { id },
        data: { withdrawDate: null },
        include: STUDENT_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  /** Yumusak silme (listelerden kalkar); yoklama gecmisi raporlar icin korunur. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({ where: { id, deletedAt: null } });
      const today = todayInTurkey();
      await closeMemberships(tx, { studentId: id }, today);
      await tx.student.update({
        where: { id },
        data: { deletedAt: new Date(), withdrawDate: student.withdrawDate ?? today },
      });
    });
  }

  groups(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.student.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      const memberships = await tx.groupMembership.findMany({
        where: { studentId: id },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              deletedAt: true,
              term: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ effectiveTo: { sort: 'desc', nulls: 'first' } }, { effectiveFrom: 'desc' }],
      });
      return memberships.map((m) => ({
        id: m.id,
        group: { id: m.group.id, name: m.group.name, isDeleted: m.group.deletedAt !== null },
        term: m.group.term,
        effectiveFrom: m.effectiveFrom,
        effectiveTo: m.effectiveTo,
        isActive: m.effectiveTo === null,
      }));
    });
  }

  /** Grup degistirme: eski uyelik effectiveDate'te kapanir, yenisi ayni gun baslar. */
  transfer(user: AuthenticatedUser, id: string, dto: GroupTransferDto) {
    if (dto.fromGroupId === dto.toGroupId) {
      throw new BadRequestException('Kaynak ve hedef grup ayni olamaz');
    }
    const date = dateOnly(dto.effectiveDate);
    return withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.groupMembership.findFirst({
        where: { studentId: id, groupId: dto.fromGroupId, effectiveTo: null },
      });
      if (!current) throw new NotFoundException('Ogrenci kaynak grupta aktif degil');
      if (date < current.effectiveFrom) {
        throw new BadRequestException('Gecis tarihi mevcut uyeligin baslangicindan once olamaz');
      }
      const alreadyInTarget = await tx.groupMembership.findFirst({
        where: { studentId: id, groupId: dto.toGroupId, effectiveTo: null },
      });
      if (alreadyInTarget) throw new ConflictException('Ogrenci hedef grupta zaten aktif');
      await tx.groupMembership.update({ where: { id: current.id }, data: { effectiveTo: date } });
      const created = await tx.groupMembership.create({
        data: { studentId: id, groupId: dto.toGroupId, effectiveFrom: date },
        include: { group: { select: { id: true, name: true } } },
      });
      return {
        closed: { id: current.id, groupId: current.groupId, effectiveTo: date },
        opened: { id: created.id, group: created.group, effectiveFrom: created.effectiveFrom },
      };
    });
  }

  attendance(user: AuthenticatedUser, id: string, query: DateRangeQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.student.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      const records = await tx.attendanceRecord.findMany({
        where: { studentId: id, sessionOccurrence: { date: dayRange(query.from, query.to) } },
        include: {
          sessionOccurrence: {
            select: {
              id: true,
              date: true,
              isMakeup: true,
              schedule: {
                select: {
                  startTime: true,
                  endTime: true,
                  group: { select: { id: true, name: true } },
                  course: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { sessionOccurrence: { date: 'desc' } },
      });
      const summary = summarize(records.map((r) => [r.status, 1] as const));
      return {
        summary,
        records: records.map((r) => ({
          id: r.id,
          status: r.status,
          statusLabel: STATUS_LABELS[r.status],
          note: r.note,
          session: {
            id: r.sessionOccurrence.id,
            date: formatDate(r.sessionOccurrence.date),
            startTime: r.sessionOccurrence.schedule.startTime,
            endTime: r.sessionOccurrence.schedule.endTime,
            isMakeup: r.sessionOccurrence.isMakeup,
          },
          group: r.sessionOccurrence.schedule.group,
          course: r.sessionOccurrence.schedule.course,
          markedAt: r.markedAt,
          updatedAt: r.updatedAt,
        })),
      };
    });
  }

  /** Ogrencinin giris hesabi (yoksa null). */
  account(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: { id: true, account: { select: ACCOUNT_SELECT } },
      });
      return { studentId: student.id, account: student.account };
    });
  }

  /**
   * Yonetici ogrenciye hesap acar: kullanici adi varsayilan olarak ogrenci numarasi,
   * sifre gecicidir ve ogrenci ilk giriste degistirmek zorundadir.
   */
  async createAccount(user: AuthenticatedUser, id: string, dto: CreateStudentAccountDto) {
    const passwordHash = await hash(dto.password, 10);
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: {
          id: true,
          institutionId: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          withdrawDate: true,
          account: { select: { id: true } },
        },
      });
      if (student.account) throw new ConflictException('Bu ogrencinin zaten bir hesabi var');
      if (student.withdrawDate) throw new ConflictException('Ayrilmis ogrenciye hesap acilamaz');
      const username = dto.username ?? student.studentNumber.trim().toLowerCase();
      if (!USERNAME.test(username)) {
        throw new BadRequestException(
          'Ogrenci numarasi kullanici adi olarak kullanilamiyor; gecerli bir kullanici adi girin',
        );
      }
      try {
        return await tx.user.create({
          data: {
            role: UserRole.STUDENT,
            studentId: student.id,
            institutionId: student.institutionId,
            fullName: `${student.firstName} ${student.lastName}`,
            username,
            passwordHash,
            mustChangePassword: true,
          },
          select: ACCOUNT_SELECT,
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          throw new ConflictException(`"${username}" kullanici adi baska bir hesapta kullaniliyor`);
        }
        throw error;
      }
    });
  }

  /** Gecici sifre verme (ogrenci yine ilk giriste degistirir) veya hesabi kapatma/acma. */
  async updateAccount(user: AuthenticatedUser, id: string, dto: UpdateStudentAccountDto) {
    const passwordHash = dto.password ? await hash(dto.password, 10) : undefined;
    return withTenant(toTenantContext(user), async (tx) => {
      const student = await tx.student.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: { withdrawDate: true, account: { select: { id: true } } },
      });
      if (!student.account) throw new NotFoundException('Bu ogrencinin hesabi yok');
      if (dto.isActive && student.withdrawDate) {
        throw new ConflictException('Ayrilmis ogrencinin hesabi acilamaz; once kaydi geri alin');
      }
      return tx.user.update({
        where: { id: student.account.id },
        data: {
          ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
          ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        },
        select: ACCOUNT_SELECT,
      });
    });
  }

  async export(user: AuthenticatedUser, query: StudentExportQueryDto) {
    const rows = await withTenant(toTenantContext(user), async (tx) =>
      present(
        tx,
        await tx.student.findMany({
          where: studentWhere(query),
          include: STUDENT_INCLUDE,
          orderBy: studentOrder(query.sort),
          take: 10_000,
        }),
      ),
    );
    const exporter = getReportExporter(query.format);
    const buffer = await exporter.export(
      rows.map((s) => ({
        'Öğrenci No': s.studentNumber,
        Ad: s.firstName,
        Soyad: s.lastName,
        Yurt: s.institution?.name ?? '',
        'Burs Programı': s.scholarshipProgram?.name ?? '',
        Üniversite: s.university ?? '',
        Bölüm: s.department ?? '',
        Sınıf:
          s.universityYear === null ? '' : s.universityYear === 0 ? 'Hazırlık' : s.universityYear,
        Gruplar: s.groups.map((g) => g.name).join(', '),
        Telefon: s.phone ?? '',
        Veli: s.guardian.name ?? '',
        'Veli Telefon': s.guardian.phone ?? '',
        'Kayıt Tarihi': formatDate(s.enrollDate),
        Durum: s.status === 'ACTIVE' ? 'Aktif' : 'Ayrılmış',
      })),
      'ogrenciler',
    );
    return { buffer, exporter };
  }

  async importTemplate() {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Öğrenciler');
    sheet.addRow(TEMPLATE_HEADERS).font = { bold: true };
    sheet.addRow([
      '2026001',
      'Zeynep',
      'Yıldız',
      'K',
      'ILAHIYAT_AKADEMI',
      'Necmettin Erbakan Üniversitesi',
      'İlahiyat',
      'Hazırlık',
      '05551234567',
      'Ayşe Yıldız',
      '05557654321',
      'veli@example.com',
      '01.10.2026',
    ]);
    sheet.columns.forEach((column) => (column.width = 20));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Excel'den toplu ogrenci aktarimi. Ilk satir baslik; sutunlar basliga gore okunur
   * (sira onemsiz, bkz. student-import.ts ve GET /students/import-template).
   * Hatali satirlar atlanir ve satir numarasiyla raporlanir; digerleri aktarilir.
   */
  async importFromExcel(user: AuthenticatedUser, buffer: Buffer, requestedInstitution?: string) {
    const institutionId = targetInstitution(user, requestedInstitution);
    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException('Dosya okunamadi; .xlsx formatinda bir Excel dosyasi yukleyin');
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new BadRequestException('Excel dosyasinda sayfa bulunamadi');

    const sheet: SheetRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      sheet.push({ rowNumber, values: (row.values as unknown[]).slice(1) });
    });

    return withTenant(toTenantContext(user), async (tx) => {
      const institution = await tx.institution.findUniqueOrThrow({
        where: { id: institutionId },
        select: { gender: true },
      });
      const programs = await tx.scholarshipProgram.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
      });
      const { students, errors } = parseStudentSheet(sheet, programs, institution.gender);

      let created = 0;
      let updated = 0;
      for (const { rowNumber, ...student } of students) {
        const result = await withSavepoint(tx, async () => {
          // institutionId+studentNumber icin Prisma @@unique yok (sadece aktif kayitlar
          // arasinda raw SQL partial unique index var), bu yuzden upsert yerine bul-sonra-yaz.
          const existing = await tx.student.findFirst({
            where: { institutionId, studentNumber: student.studentNumber, deletedAt: null },
            select: { id: true },
          });
          if (existing) {
            await tx.student.update({
              where: { id: existing.id },
              data: { ...student, studentNumber: undefined, enrollDate: undefined },
            });
            return 'updated' as const;
          }
          await tx.student.create({ data: { ...student, institutionId } });
          return 'created' as const;
        });
        if (!result.ok) errors.push(`Satir ${rowNumber}: ${result.reason}`);
        else if (result.value === 'created') created++;
        else updated++;
      }
      return { imported: created + updated, created, updated, errors };
    });
  }
}

function studentWhere(query: StudentQueryDto): Prisma.StudentWhereInput {
  const terms = query.search?.trim().split(/\s+/).filter(Boolean) ?? [];
  return {
    deletedAt: null,
    ...(query.status === 'active' ? { withdrawDate: null } : {}),
    ...(query.status === 'withdrawn' ? { withdrawDate: { not: null } } : {}),
    ...(query.institutionId ? { institutionId: query.institutionId } : {}),
    ...(query.scholarshipProgramId ? { scholarshipProgramId: query.scholarshipProgramId } : {}),
    ...(query.gender ? { gender: query.gender } : {}),
    ...(query.universityYear === undefined ? {} : { universityYear: query.universityYear }),
    ...(query.groupId
      ? { memberships: { some: { groupId: query.groupId, effectiveTo: null } } }
      : {}),
    // "ali arslan" -> her kelime ad, soyad veya numarada gecmeli
    ...(terms.length
      ? {
          AND: terms.map((term) => ({
            OR: [
              { firstName: contains(term) },
              { lastName: contains(term) },
              { studentNumber: contains(term) },
            ],
          })),
        }
      : {}),
  };
}

function studentOrder(sort: StudentQueryDto['sort']): Prisma.StudentOrderByWithRelationInput[] {
  switch (sort) {
    case 'studentNumber':
      return [{ studentNumber: 'asc' }];
    case 'enrollDate':
      return [{ enrollDate: 'desc' }, { lastName: 'asc' }];
    case 'createdAt':
      return [{ createdAt: 'desc' }];
    default:
      return [{ lastName: 'asc' }, { firstName: 'asc' }];
  }
}

async function present(tx: PrismaClient, rows: StudentRow[]) {
  const names = await institutionNames(
    tx,
    rows.map((r) => r.institutionId),
  );
  return rows.map((r) => ({
    id: r.id,
    studentNumber: r.studentNumber,
    firstName: r.firstName,
    lastName: r.lastName,
    fullName: `${r.firstName} ${r.lastName}`,
    gender: r.gender,
    phone: r.phone,
    university: r.university,
    department: r.department,
    universityYear: r.universityYear,
    institution: ref(r.institutionId, names),
    scholarshipProgram: r.scholarshipProgram,
    guardian: { name: r.guardianName, phone: r.guardianPhone, email: r.guardianEmail },
    enrollDate: r.enrollDate,
    withdrawDate: r.withdrawDate,
    status: r.withdrawDate ? ('WITHDRAWN' as const) : ('ACTIVE' as const),
    groups: r.memberships.map((m) => m.group),
    account: r.account,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}
