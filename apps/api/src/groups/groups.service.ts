import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { DAY_NAMES, dateOnly, todayInTurkey } from '../common/dates';
import { withSavepoint } from '../common/db-helpers';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref, userNames } from '../common/lookups';
import { closeMemberships, membershipAt } from '../common/memberships';
import { contains, pageArgs, toPage } from '../common/pagination';
import type {
  AddMembersDto,
  CreateGroupDto,
  EndMembershipQueryDto,
  GroupQueryDto,
  MembersQueryDto,
  UpdateGroupDto,
} from './dto/group.dto';

const GROUP_INCLUDE = {
  term: { select: { id: true, name: true, startDate: true, endDate: true } },
  scholarshipProgram: { select: { id: true, code: true, name: true } },
  _count: {
    select: {
      memberships: { where: { effectiveTo: null } },
      schedules: { where: { isActive: true } },
    },
  },
} satisfies Prisma.GroupInclude;

type GroupRow = Prisma.GroupGetPayload<{ include: typeof GROUP_INCLUDE }>;

@Injectable()
export class GroupsService {
  list(user: AuthenticatedUser, query: GroupQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.GroupWhereInput = {
        deletedAt: null,
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.termId ? { termId: query.termId } : {}),
        ...(query.scholarshipProgramId ? { scholarshipProgramId: query.scholarshipProgramId } : {}),
        ...(query.search ? { name: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.group.findMany({
          where,
          include: GROUP_INCLUDE,
          orderBy: [{ term: { startDate: 'desc' } }, { name: 'asc' }],
          ...pageArgs(query),
        }),
        tx.group.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.group.findFirstOrThrow({
        where: { id, deletedAt: null },
        include: {
          ...GROUP_INCLUDE,
          schedules: {
            where: { isActive: true },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              classroom: true,
              teacherId: true,
              course: { select: { id: true, name: true } },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      });
      const [group] = await present(tx, [row]);
      const teachers = await userNames(
        tx,
        row.schedules.map((s) => s.teacherId),
      );
      return {
        ...group,
        schedules: row.schedules.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          dayName: DAY_NAMES[s.dayOfWeek],
          startTime: s.startTime,
          endTime: s.endTime,
          classroom: s.classroom,
          course: s.course,
          teacher: ref(s.teacherId, teachers),
        })),
      };
    });
  }

  /**
   * Grup acilirken sinifa gore toplu ekleme yalnizca bir kerelik kolayliktir; gruba kalici
   * bir "seviye" alani yazilmaz (bkz. plan). Secilen siniflardaki uygun ogrenciler bulunup
   * addMembers ile ayni per-ogrenci SAVEPOINT dongusunden gecirilir.
   */
  create(user: AuthenticatedUser, dto: CreateGroupDto) {
    const institutionId = targetInstitution(user, dto.institutionId);
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.group.create({
        data: {
          institutionId,
          termId: dto.termId,
          name: dto.name,
          scholarshipProgramId: dto.scholarshipProgramId,
        },
        include: GROUP_INCLUDE,
      });
      const group = (await present(tx, [row]))[0];
      if (!dto.autoEnrollUniversityYears?.length) {
        return { ...group, enrolled: null };
      }
      const candidates = await tx.student.findMany({
        where: {
          institutionId,
          deletedAt: null,
          withdrawDate: null,
          universityYear: { in: dto.autoEnrollUniversityYears },
          ...(dto.scholarshipProgramId ? { scholarshipProgramId: dto.scholarshipProgramId } : {}),
        },
        select: { id: true },
      });
      const enrolled = await enrollStudents(
        tx,
        row.id,
        candidates.map((s) => s.id),
        todayInTurkey(),
      );
      return { ...group, enrolled };
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateGroupDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.group.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      const row = await tx.group.update({
        where: { id },
        data: {
          name: dto.name,
          termId: dto.termId,
          scholarshipProgramId: dto.scholarshipProgramId,
        },
        include: GROUP_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  /** Yumusak silme: aktif uyelikler bugun kapanir, haftalik dersler pasif olur; gecmis kalir. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.group.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      await closeMemberships(tx, { groupId: id }, todayInTurkey());
      await tx.lessonSchedule.updateMany({ where: { groupId: id }, data: { isActive: false } });
      await tx.group.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }

  members(user: AuthenticatedUser, id: string, query: MembersQueryDto) {
    const date = query.date ? dateOnly(query.date) : todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.group.findFirstOrThrow({ where: { id }, select: { id: true } });
      const memberships = await tx.groupMembership.findMany({
        where: { groupId: id, ...membershipAt(date) },
        include: {
          student: {
            select: {
              id: true,
              studentNumber: true,
              firstName: true,
              lastName: true,
              gender: true,
              withdrawDate: true,
              deletedAt: true,
            },
          },
        },
        orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
      });
      return memberships.map((m) => ({
        membershipId: m.id,
        effectiveFrom: m.effectiveFrom,
        effectiveTo: m.effectiveTo,
        student: {
          id: m.student.id,
          studentNumber: m.student.studentNumber,
          firstName: m.student.firstName,
          lastName: m.student.lastName,
          fullName: `${m.student.firstName} ${m.student.lastName}`,
          gender: m.student.gender,
          status: m.student.withdrawDate ? 'WITHDRAWN' : 'ACTIVE',
        },
      }));
    });
  }

  /** Toplu uyelik ekleme; uygun olmayan ogrenci (yurt/program uyusmazligi) tek tek raporlanir. */
  addMembers(user: AuthenticatedUser, id: string, dto: AddMembersDto) {
    const effectiveFrom = dateOnly(dto.effectiveFrom);
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.group.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
      return enrollStudents(tx, id, dto.studentIds, effectiveFrom);
    });
  }

  endMembership(
    user: AuthenticatedUser,
    id: string,
    studentId: string,
    query: EndMembershipQueryDto,
  ) {
    const effectiveTo = query.effectiveTo ? dateOnly(query.effectiveTo) : todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      const membership = await tx.groupMembership.findFirst({
        where: { groupId: id, studentId, effectiveTo: null },
      });
      if (!membership) throw new NotFoundException('Ogrenci bu grupta aktif degil');
      if (effectiveTo < membership.effectiveFrom) {
        throw new BadRequestException('Bitis tarihi uyelik baslangicindan once olamaz');
      }
      await tx.groupMembership.update({ where: { id: membership.id }, data: { effectiveTo } });
    });
  }
}

/** Her ogrenciyi kendi SAVEPOINT'inde dener; uygun olmayan (yurt/program uyusmazligi vb.) tek tek raporlanir. */
async function enrollStudents(
  tx: PrismaClient,
  groupId: string,
  studentIds: string[],
  effectiveFrom: Date,
) {
  const added: string[] = [];
  const skipped: { studentId: string; reason: string }[] = [];
  for (const studentId of [...new Set(studentIds)]) {
    const active = await tx.groupMembership.findFirst({
      where: { groupId, studentId, effectiveTo: null },
      select: { id: true },
    });
    if (active) {
      skipped.push({ studentId, reason: 'ogrenci bu grupta zaten aktif' });
      continue;
    }
    const result = await withSavepoint(tx, () =>
      tx.groupMembership.create({ data: { groupId, studentId, effectiveFrom } }),
    );
    if (result.ok) added.push(studentId);
    else skipped.push({ studentId, reason: result.reason });
  }
  return { added: added.length, addedStudentIds: added, skipped };
}

async function present(tx: PrismaClient, rows: GroupRow[]) {
  const names = await institutionNames(
    tx,
    rows.map((r) => r.institutionId),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    institution: ref(r.institutionId, names),
    term: r.term,
    scholarshipProgram: r.scholarshipProgram,
    activeStudentCount: r._count.memberships,
    activeScheduleCount: r._count.schedules,
    createdAt: r.createdAt,
  }));
}
