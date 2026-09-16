import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { STATUS_LABELS, attendanceRate, emptyCounts, summarize } from '../common/attendance-stats';
import {
  DAY_NAMES,
  addDays,
  dayRange,
  formatDate,
  mondayBasedDay,
  todayInTurkey,
} from '../common/dates';
import { institutionNames, ref, userNames } from '../common/lookups';
import { RealtimeService, type RealtimeEvent } from '../realtime/realtime.service';
import type { PortalAttendanceQueryDto, SubmissionDto, UpdateOwnProfileDto } from './portal.dto';

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const ABSENCE_ALERT_THRESHOLD = Number(process.env.ABSENCE_ALERT_THRESHOLD ?? 3);
const UPCOMING_DAYS = 14;

export const EDITABLE_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'university',
  'department',
  'universityYear',
  'guardianName',
  'guardianPhone',
  'guardianEmail',
] as const;

const SUBMISSION_SELECT = {
  id: true,
  text: true,
  fileName: true,
  fileSize: true,
  submittedAt: true,
  updatedAt: true,
} satisfies Prisma.AssignmentSubmissionSelect;

/** Oturumdaki ogrenci kaydi; hesap veya kayit pasifse (silindi/ayrildi) erisim yok. */
async function currentStudentId(tx: PrismaClient): Promise<string> {
  const [row] = await tx.$queryRaw<{ id: string | null }[]>`SELECT app_student_id() AS id`;
  if (!row?.id) throw new UnauthorizedException('Ogrenci hesabiniz aktif degil');
  return row.id;
}

async function activeGroupIds(tx: PrismaClient, studentId: string): Promise<string[]> {
  const memberships = await tx.groupMembership.findMany({
    where: { studentId, effectiveTo: null, group: { deletedAt: null } },
    select: { groupId: true },
  });
  return memberships.map((m) => m.groupId);
}

function safePdfName(original: string): string {
  const base =
    original
      .split(/[\\/]/)
      .pop()
      ?.replace(/[^\p{L}\p{N} ._()-]/gu, '')
      .trim() || 'odev';
  const trimmed = base.slice(0, 180);
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
}

/**
 * Ogrenci paneli. Tum sorgular ogrencinin kendi oturumuyla RLS altinda calisir:
 * ogrenci yalnizca kendi kaydini, gruplarini, derslerini, hocalarini, yoklamasini ve
 * derslerindeki odevleri gorebilir.
 */
@Injectable()
export class PortalService {
  constructor(private readonly realtime: RealtimeService) {}

  profile(user: AuthenticatedUser) {
    return withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      const s = await tx.student.findUniqueOrThrow({
        where: { id },
        include: {
          scholarshipProgram: { select: { id: true, code: true, name: true } },
          memberships: {
            where: { effectiveTo: null, group: { deletedAt: null } },
            select: {
              effectiveFrom: true,
              group: {
                select: { id: true, name: true, term: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });
      const institutions = await institutionNames(tx, [s.institutionId]);
      return {
        id: s.id,
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName}`,
        gender: s.gender,
        phone: s.phone,
        university: s.university,
        department: s.department,
        universityYear: s.universityYear,
        guardian: { name: s.guardianName, phone: s.guardianPhone, email: s.guardianEmail },
        enrollDate: formatDate(s.enrollDate),
        institution: ref(s.institutionId, institutions),
        scholarshipProgram: s.scholarshipProgram,
        groups: s.memberships.map((m) => ({
          id: m.group.id,
          name: m.group.name,
          term: m.group.term,
          since: formatDate(m.effectiveFrom),
        })),
        editableFields: EDITABLE_PROFILE_FIELDS,
      };
    });
  }

  async updateProfile(user: AuthenticatedUser, dto: UpdateOwnProfileDto) {
    await withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      // Kilitli alanlar DTO'da yok; veritabani tetikleyicisi de ayrica engeller.
      await tx.student.update({ where: { id }, data: dto });
    });
    return this.profile(user);
  }

  /** Haftalik ders tablosu, dersler ve hocalari, onumuzdeki 14 gunun dersleri ve tatiller. */
  schedule(user: AuthenticatedUser) {
    const today = todayInTurkey();
    const until = addDays(today, UPCOMING_DAYS);
    return withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      const groupIds = await activeGroupIds(tx, id);
      const [lessons, sessions, holidays] = await Promise.all([
        tx.lessonSchedule.findMany({
          where: { groupId: { in: groupIds }, isActive: true },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            classroom: true,
            teacherId: true,
            group: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
        tx.sessionOccurrence.findMany({
          where: { schedule: { groupId: { in: groupIds } }, date: { gte: today, lte: until } },
          select: {
            id: true,
            date: true,
            isCancelled: true,
            cancelReason: true,
            isMakeup: true,
            schedule: {
              select: {
                startTime: true,
                endTime: true,
                classroom: true,
                teacherId: true,
                group: { select: { id: true, name: true } },
                course: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ date: 'asc' }, { schedule: { startTime: 'asc' } }],
        }),
        tx.holiday.findMany({
          where: { date: { gte: today, lte: until } },
          orderBy: { date: 'asc' },
        }),
      ]);
      const teachers = await userNames(tx, [
        ...lessons.map((l) => l.teacherId),
        ...sessions.map((s) => s.schedule.teacherId),
      ]);

      const courses = new Map<
        string,
        {
          course: { id: string; name: string };
          teachers: Set<string>;
          groups: Set<string>;
          weeklyLessons: number;
        }
      >();
      for (const lesson of lessons) {
        const entry = courses.get(lesson.course.id) ?? {
          course: lesson.course,
          teachers: new Set<string>(),
          groups: new Set<string>(),
          weeklyLessons: 0,
        };
        const teacher = teachers.get(lesson.teacherId);
        if (teacher) entry.teachers.add(teacher);
        entry.groups.add(lesson.group.name);
        entry.weeklyLessons += 1;
        courses.set(lesson.course.id, entry);
      }

      return {
        lessons: lessons.map((l) => ({
          id: l.id,
          dayOfWeek: l.dayOfWeek,
          dayName: DAY_NAMES[l.dayOfWeek],
          startTime: l.startTime,
          endTime: l.endTime,
          classroom: l.classroom,
          group: l.group,
          course: l.course,
          teacher: ref(l.teacherId, teachers),
        })),
        courses: [...courses.values()].map((c) => ({
          course: c.course,
          teachers: [...c.teachers],
          groups: [...c.groups],
          weeklyLessons: c.weeklyLessons,
        })),
        upcoming: sessions.map((s) => ({
          id: s.id,
          date: formatDate(s.date),
          dayName: DAY_NAMES[mondayBasedDay(s.date)],
          startTime: s.schedule.startTime,
          endTime: s.schedule.endTime,
          classroom: s.schedule.classroom,
          group: s.schedule.group,
          course: s.schedule.course,
          teacher: ref(s.schedule.teacherId, teachers),
          isCancelled: s.isCancelled,
          cancelReason: s.cancelReason,
          isMakeup: s.isMakeup,
        })),
        holidays: holidays.map((h) => ({ date: formatDate(h.date), description: h.description })),
      };
    });
  }

  /** Kendi yoklamasi: kayitlar, genel ve ders bazli devam yuzdesi, devamsizlik uyarisi. */
  attendance(user: AuthenticatedUser, query: PortalAttendanceQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      const records = await tx.attendanceRecord.findMany({
        where: { studentId: id, sessionOccurrence: { date: dayRange(query.from, query.to) } },
        select: {
          id: true,
          status: true,
          note: true,
          sessionOccurrence: {
            select: {
              date: true,
              isMakeup: true,
              schedule: {
                select: {
                  startTime: true,
                  endTime: true,
                  teacherId: true,
                  group: { select: { id: true, name: true } },
                  course: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { sessionOccurrence: { date: 'desc' } },
      });
      const teachers = await userNames(
        tx,
        records.map((r) => r.sessionOccurrence.schedule.teacherId),
      );
      const summary = summarize(records.map((r) => [r.status, 1] as const));
      const byCourse = new Map<
        string,
        { course: { id: string; name: string }; counts: ReturnType<typeof emptyCounts> }
      >();
      for (const record of records) {
        const course = record.sessionOccurrence.schedule.course;
        const entry = byCourse.get(course.id) ?? { course, counts: emptyCounts() };
        entry.counts[record.status] += 1;
        byCourse.set(course.id, entry);
      }
      const unexcused = summary.counts.ABSENT;
      return {
        summary,
        alert: {
          threshold: ABSENCE_ALERT_THRESHOLD,
          unexcusedAbsences: unexcused,
          reached: unexcused >= ABSENCE_ALERT_THRESHOLD,
          nearing: unexcused === ABSENCE_ALERT_THRESHOLD - 1,
        },
        courses: [...byCourse.values()].map((c) => ({
          course: c.course,
          counts: c.counts,
          attendanceRate: attendanceRate(c.counts),
        })),
        records: records.map((r) => ({
          id: r.id,
          status: r.status,
          statusLabel: STATUS_LABELS[r.status],
          note: r.note,
          date: formatDate(r.sessionOccurrence.date),
          startTime: r.sessionOccurrence.schedule.startTime,
          endTime: r.sessionOccurrence.schedule.endTime,
          isMakeup: r.sessionOccurrence.isMakeup,
          course: r.sessionOccurrence.schedule.course,
          group: r.sessionOccurrence.schedule.group,
          teacher: ref(r.sessionOccurrence.schedule.teacherId, teachers),
        })),
      };
    });
  }

  assignments(user: AuthenticatedUser) {
    return withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      const groupIds = await activeGroupIds(tx, id);
      const rows = await tx.assignment.findMany({
        where: { deletedAt: null, schedule: { groupId: { in: groupIds } } },
        select: {
          id: true,
          title: true,
          dueAt: true,
          allowText: true,
          allowFile: true,
          createdAt: true,
          schedule: {
            select: {
              teacherId: true,
              group: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
            },
          },
          submissions: { where: { studentId: id }, select: { submittedAt: true } },
        },
        orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      });
      const teachers = await userNames(
        tx,
        rows.map((r) => r.schedule.teacherId),
      );
      const now = new Date();
      return rows.map((r) => {
        const submission = r.submissions[0];
        return {
          id: r.id,
          title: r.title,
          dueAt: r.dueAt,
          allowText: r.allowText,
          allowFile: r.allowFile,
          createdAt: r.createdAt,
          course: r.schedule.course,
          group: r.schedule.group,
          teacher: ref(r.schedule.teacherId, teachers),
          submittedAt: submission?.submittedAt ?? null,
          status: submission
            ? ('SUBMITTED' as const)
            : r.dueAt && r.dueAt < now
              ? ('MISSED' as const)
              : ('PENDING' as const),
        };
      });
    });
  }

  assignment(user: AuthenticatedUser, assignmentId: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const id = await currentStudentId(tx);
      const row = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          dueAt: true,
          allowText: true,
          allowFile: true,
          createdAt: true,
          updatedAt: true,
          schedule: {
            select: {
              teacherId: true,
              group: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
            },
          },
          submissions: { where: { studentId: id }, select: SUBMISSION_SELECT },
        },
      });
      if (!row) throw new NotFoundException('Odev bulunamadi');
      const teachers = await userNames(tx, [row.schedule.teacherId]);
      const submission = row.submissions[0] ?? null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        dueAt: row.dueAt,
        allowText: row.allowText,
        allowFile: row.allowFile,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        course: row.schedule.course,
        group: row.schedule.group,
        teacher: ref(row.schedule.teacherId, teachers),
        canSubmit: !row.dueAt || row.dueAt >= new Date(),
        maxFileBytes: MAX_PDF_BYTES,
        submission: submission && presentSubmission(submission),
      };
    });
  }

  /**
   * Cevap ekler veya gunceller (teslim tarihine kadar). Metin ve PDF birlikte olabilir;
   * gonderilmeyen kisim korunur. Kaydedilince hoca ve yoneticinin ekrani anlik guncellenir.
   */
  async submit(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: SubmissionDto,
    file?: Express.Multer.File,
  ) {
    if (file) {
      const isPdf =
        file.mimetype === 'application/pdf' &&
        file.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
      if (!isPdf) throw new BadRequestException('Sadece PDF dosyasi yuklenebilir');
      if (file.size > MAX_PDF_BYTES) throw new BadRequestException('PDF en fazla 10 MB olabilir');
    }
    const text = dto.text === undefined ? undefined : dto.text.trim() === '' ? null : dto.text;

    const { saved, event } = await withTenant(toTenantContext(user), async (tx) => {
      const studentId = await currentStudentId(tx);
      const assignment = await this.openAssignment(tx, assignmentId);
      if (text && !assignment.allowText)
        throw new BadRequestException('Bu odev metin cevap kabul etmiyor');
      if (file && !assignment.allowFile)
        throw new BadRequestException('Bu odev dosya kabul etmiyor');

      const key = { assignmentId_studentId: { assignmentId, studentId } };
      const existing = await tx.assignmentSubmission.findUnique({
        where: key,
        select: { text: true, fileName: true },
      });
      const finalText = text === undefined ? (existing?.text ?? null) : text;
      const keepsFile = file ? true : dto.removeFile ? false : Boolean(existing?.fileName);
      if (!finalText && !keepsFile) {
        throw new BadRequestException('Metin cevap yazin veya PDF ekleyin');
      }
      const fileFields = file
        ? {
            fileName: safePdfName(file.originalname),
            fileMime: 'application/pdf',
            fileSize: file.size,
            fileData: new Uint8Array(file.buffer),
          }
        : dto.removeFile
          ? { fileName: null, fileMime: null, fileSize: null, fileData: null }
          : {};
      const saved = await tx.assignmentSubmission.upsert({
        where: key,
        create: { assignmentId, studentId, text: finalText, ...fileFields },
        update: { text: finalText, ...fileFields, submittedAt: new Date() },
        select: SUBMISSION_SELECT,
      });
      const student = await tx.student.findUniqueOrThrow({
        where: { id: studentId },
        select: { firstName: true, lastName: true },
      });
      const event: RealtimeEvent = {
        type: 'submission.saved',
        institutionId: assignment.institutionId,
        teacherId: assignment.schedule.teacherId,
        studentIds: [studentId],
        payload: {
          assignmentId,
          studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          submittedAt: saved.submittedAt,
          hasText: saved.text !== null,
          hasFile: saved.fileName !== null,
        },
      };
      return { saved, event };
    });
    this.realtime.publish(event);
    return presentSubmission(saved);
  }

  async removeSubmission(user: AuthenticatedUser, assignmentId: string) {
    const event = await withTenant(toTenantContext(user), async (tx) => {
      const studentId = await currentStudentId(tx);
      const assignment = await this.openAssignment(tx, assignmentId);
      const deleted = await tx.assignmentSubmission.deleteMany({
        where: { assignmentId, studentId },
      });
      if (deleted.count === 0) throw new NotFoundException('Bu odeve cevap eklenmemis');
      return {
        type: 'submission.removed',
        institutionId: assignment.institutionId,
        teacherId: assignment.schedule.teacherId,
        studentIds: [studentId],
        payload: { assignmentId, studentId },
      } satisfies RealtimeEvent;
    });
    this.realtime.publish(event);
  }

  ownFile(user: AuthenticatedUser, assignmentId: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const studentId = await currentStudentId(tx);
      const submission = await tx.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        select: { fileName: true, fileData: true },
      });
      if (!submission?.fileData || !submission.fileName)
        throw new NotFoundException('Yuklenmis PDF yok');
      return { fileName: submission.fileName, data: Buffer.from(submission.fileData) };
    });
  }

  /** KVKK: ogrencinin sistemdeki kendi verisinin makine tarafindan okunur kopyasi. */
  async exportData(user: AuthenticatedUser) {
    const [profile, attendance, schedule, assignments] = await Promise.all([
      this.profile(user),
      this.attendance(user, {}),
      this.schedule(user),
      this.assignments(user),
    ]);
    const personal: Partial<typeof profile> = { ...profile };
    delete personal.editableFields;
    return {
      generatedAt: new Date(),
      note: 'Bu dosya sistemde size ait kayitlarin kopyasidir. Yuklediginiz PDF dosyalari ayrica odev sayfasindan indirilebilir.',
      profile: personal,
      lessons: schedule.lessons,
      attendance: { summary: attendance.summary, records: attendance.records },
      assignments,
    };
  }

  private async openAssignment(tx: PrismaClient, assignmentId: string) {
    const assignment = await tx.assignment.findFirst({
      where: { id: assignmentId, deletedAt: null },
      select: {
        id: true,
        dueAt: true,
        allowText: true,
        allowFile: true,
        institutionId: true,
        schedule: { select: { teacherId: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Odev bulunamadi');
    if (assignment.dueAt && assignment.dueAt < new Date()) {
      throw new ConflictException('Teslim tarihi gecti; cevap degistirilemez');
    }
    return assignment;
  }
}

function presentSubmission(
  s: Prisma.AssignmentSubmissionGetPayload<{ select: typeof SUBMISSION_SELECT }>,
) {
  return {
    id: s.id,
    text: s.text,
    file: s.fileName ? { name: s.fileName, size: s.fileSize } : null,
    submittedAt: s.submittedAt,
    updatedAt: s.updatedAt,
  };
}
