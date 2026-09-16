import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import {
  ATTENDANCE_ABSENCE_EVENT,
  AttendanceAbsenceEvent,
} from '../attendance/events/attendance-absence.event';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { ABSENCE_STATUSES, STATUS_LABELS, summarize } from '../common/attendance-stats';
import {
  DAY_NAMES,
  addDays,
  dateOnly,
  dayRange,
  formatDate,
  mondayBasedDay,
  todayInTurkey,
} from '../common/dates';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref, userNames } from '../common/lookups';
import { membershipAt } from '../common/memberships';
import { contains, pageArgs, toPage } from '../common/pagination';
import { QrTokenService } from '../students/qr-token.service';
import { assertAttendanceStarted, attendanceLock, occursOn } from '../schedule/calendar';
import type {
  AllPresentQueryDto,
  AttendanceEntryDto,
  CancelSessionDto,
  CreateMakeupDto,
  GenerateSessionsDto,
  MarkAttendanceDto,
  SessionQueryDto,
  TodayQueryDto,
} from './sessions.dto';

const SCHEDULE_SELECT = {
  startDate: true,
  endDate: true,
  breaks: true,
  dayOfWeek: true,
  isActive: true,
  id: true,
  startTime: true,
  endTime: true,
  classroom: true,
  teacherId: true,
  institutionId: true,
  group: { select: { id: true, name: true } },
  course: { select: { id: true, name: true } },
} satisfies Prisma.LessonScheduleSelect;

const SESSION_INCLUDE = {
  schedule: { select: SCHEDULE_SELECT },
  _count: { select: { attendanceRecords: true } },
} satisfies Prisma.SessionOccurrenceInclude;

type SessionRow = Prisma.SessionOccurrenceGetPayload<{ include: typeof SESSION_INCLUDE }>;
type ScheduleSummary = Prisma.LessonScheduleGetPayload<{ select: typeof SCHEDULE_SELECT }>;

const MAX_GENERATE_DAYS = 400;

@Injectable()
export class SessionsService {
  constructor(
    private readonly events: EventEmitter2,
    private readonly qrTokens: QrTokenService,
  ) {}

  list(user: AuthenticatedUser, query: SessionQueryDto) {
    const today = todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      const and: Prisma.SessionOccurrenceWhereInput[] = [];
      const range = dayRange(query.from, query.to);
      if (range) and.push({ date: range });
      if (query.status === 'upcoming') and.push({ date: { gte: today }, isCancelled: false });
      if (query.status === 'past') and.push({ date: { lt: today }, isCancelled: false });
      if (query.status === 'cancelled') and.push({ isCancelled: true });
      if (query.attendance === 'taken') and.push({ attendanceRecords: { some: {} } });
      if (query.attendance === 'missing') {
        and.push({ attendanceRecords: { none: {} }, isCancelled: false, date: { lte: today } });
      }
      const where: Prisma.SessionOccurrenceWhereInput = {
        AND: and,
        ...(query.scheduleId ? { scheduleId: query.scheduleId } : {}),
        schedule: {
          ...(query.institutionId ? { institutionId: query.institutionId } : {}),
          ...(query.groupId ? { groupId: query.groupId } : {}),
          ...(query.teacherId ? { teacherId: query.teacherId } : {}),
          ...(query.courseId ? { courseId: query.courseId } : {}),
          ...(query.search
            ? {
                OR: [
                  { group: { name: contains(query.search) } },
                  { course: { name: contains(query.search) } },
                  { teacher: { fullName: contains(query.search) } },
                ],
              }
            : {}),
        },
      };
      const direction = query.status === 'upcoming' ? 'asc' : 'desc';
      const [rows, total] = await Promise.all([
        tx.sessionOccurrence.findMany({
          where,
          include: SESSION_INCLUDE,
          orderBy: [{ date: direction }, { schedule: { startTime: 'asc' } }],
          ...pageArgs(query),
        }),
        tx.sessionOccurrence.count({ where }),
      ]);
      return toPage(await presentSessions(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(
      toTenantContext(user),
      async (tx) =>
        (
          await presentSessions(tx, [
            await tx.sessionOccurrence.findUniqueOrThrow({
              where: { id },
              include: SESSION_INCLUDE,
            }),
          ])
        )[0],
    );
  }

  /**
   * Bir gunun dersleri: haftalik programdan beklenenler + o gune eklenmis telafi dersleri.
   * Oturum henuz uretilmemisse `session: null` doner (yonetici POST /sessions/generate calistirir).
   */
  today(user: AuthenticatedUser, query: TodayQueryDto) {
    const date = query.date ? dateOnly(query.date) : todayInTurkey();
    const teacherId = user.role === UserRole.TEACHER ? user.userId : query.teacherId;
    return withTenant(toTenantContext(user), async (tx) => {
      const scheduleWhere: Prisma.LessonScheduleWhereInput = {
        ...(teacherId ? { teacherId } : {}),
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
      };
      const [schedules, sessions, holidays] = await Promise.all([
        tx.lessonSchedule.findMany({
          where: {
            ...scheduleWhere,
            isActive: true,
            dayOfWeek: mondayBasedDay(date),
            group: { deletedAt: null },
          },
          select: SCHEDULE_SELECT,
        }),
        tx.sessionOccurrence.findMany({
          where: { date, schedule: scheduleWhere },
          include: SESSION_INCLUDE,
        }),
        tx.holiday.findMany({
          where: {
            date,
            ...(query.institutionId
              ? { OR: [{ institutionId: query.institutionId }, { institutionId: null }] }
              : {}),
          },
        }),
      ]);
      const sessionBySchedule = new Map(sessions.map((s) => [s.scheduleId, s]));
      const planned = schedules.filter((s) => occursOn(s, date));
      const plannedIds = new Set(planned.map((s) => s.id));
      const lessons: { schedule: ScheduleSummary; session: SessionRow | null }[] = [
        ...planned.map((schedule) => ({
          schedule,
          session: sessionBySchedule.get(schedule.id) ?? null,
        })),
        ...sessions
          .filter((s) => !plannedIds.has(s.scheduleId))
          .map((session) => ({ schedule: session.schedule, session })),
      ].sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));

      const [teachers, institutions] = await Promise.all([
        userNames(
          tx,
          lessons.map((l) => l.schedule.teacherId),
        ),
        institutionNames(
          tx,
          lessons.map((l) => l.schedule.institutionId),
        ),
      ]);
      return {
        date: formatDate(date),
        dayName: DAY_NAMES[mondayBasedDay(date)],
        holidays: holidays.map((h) => ({
          id: h.id,
          description: h.description,
          allInstitutions: h.institutionId === null,
        })),
        lessons: lessons.map(({ schedule, session }) => ({
          scheduleId: schedule.id,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          classroom: schedule.classroom,
          group: schedule.group,
          course: schedule.course,
          teacher: ref(schedule.teacherId, teachers),
          institution: ref(schedule.institutionId, institutions),
          session: session
            ? {
                id: session.id,
                isCancelled: session.isCancelled,
                cancelReason: session.cancelReason,
                isMakeup: session.isMakeup,
                attendanceCount: session._count.attendanceRecords,
                attendanceTaken: session._count.attendanceRecords > 0,
              }
            : null,
        })),
      };
    });
  }

  /**
   * Haftalik programdan somut ders gunlerini uretir. Grubun donem tarihleri disina ve
   * tatillere oturum acilmaz; tekrar calistirmak mevcut oturumlari cogaltmaz.
   */
  generate(user: AuthenticatedUser, dto: GenerateSessionsDto) {
    const from = dateOnly(dto.from);
    const to = dateOnly(dto.to);
    if (to < from) throw new BadRequestException('Bitis tarihi baslangictan once olamaz');
    if (to.getTime() - from.getTime() > MAX_GENERATE_DAYS * 86_400_000) {
      throw new BadRequestException(`En fazla ${MAX_GENERATE_DAYS} gunluk aralik uretilebilir`);
    }
    const institutionId =
      user.role === UserRole.SUPER_ADMIN
        ? dto.institutionId
        : targetInstitution(user, dto.institutionId);

    return withTenant(toTenantContext(user), async (tx) => {
      const schedules = await tx.lessonSchedule.findMany({
        where: {
          isActive: true,
          group: { deletedAt: null },
          ...(dto.scheduleId ? { id: dto.scheduleId } : {}),
          ...(institutionId ? { institutionId } : {}),
        },
        select: {
          id: true,
          dayOfWeek: true,
          startDate: true,
          endDate: true,
          breaks: true,
          institutionId: true,
          group: { select: { term: { select: { startDate: true, endDate: true } } } },
        },
      });
      if (dto.scheduleId && schedules.length === 0) {
        throw new NotFoundException('Aktif ders programi bulunamadi');
      }
      const holidays = await tx.holiday.findMany({
        where: { date: { gte: from, lte: to } },
        select: { date: true, institutionId: true },
      });
      const holidayKeys = new Set(
        holidays.map((h) => `${h.institutionId ?? '*'}|${formatDate(h.date)}`),
      );

      const data: { scheduleId: string; date: Date }[] = [];
      let skippedHolidays = 0;
      for (const schedule of schedules) {
        const termStart = dateOnly(schedule.startDate ?? schedule.group.term.startDate);
        const termEnd = dateOnly(schedule.endDate ?? schedule.group.term.endDate);
        const start = from > termStart ? from : termStart;
        const end = to < termEnd ? to : termEnd;
        const offset = (schedule.dayOfWeek - mondayBasedDay(start) + 7) % 7;
        for (let day = addDays(start, offset); day <= end; day = addDays(day, 7)) {
          if (!occursOn(schedule, day)) continue;
          const key = formatDate(day);
          if (holidayKeys.has(`*|${key}`) || holidayKeys.has(`${schedule.institutionId}|${key}`)) {
            skippedHolidays++;
            continue;
          }
          data.push({ scheduleId: schedule.id, date: day });
        }
      }
      const result = data.length
        ? await tx.sessionOccurrence.createMany({ data, skipDuplicates: true })
        : { count: 0 };
      return {
        scheduleCount: schedules.length,
        planned: data.length,
        created: result.count,
        alreadyExisting: data.length - result.count,
        skippedHolidays,
      };
    });
  }

  createMakeup(user: AuthenticatedUser, dto: CreateMakeupDto) {
    const date = dateOnly(dto.date);
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.lessonSchedule.findFirstOrThrow({
        where: { id: dto.scheduleId, isActive: true },
        select: { id: true },
      });
      const existing = await tx.sessionOccurrence.findUnique({
        where: { scheduleId_date: { scheduleId: dto.scheduleId, date } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Bu dersin o gun zaten bir oturumu var');
      const row = await tx.sessionOccurrence.create({
        data: { scheduleId: dto.scheduleId, date, isMakeup: true },
        include: SESSION_INCLUDE,
      });
      return (await presentSessions(tx, [row]))[0];
    });
  }

  cancel(user: AuthenticatedUser, id: string, dto: CancelSessionDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const session = await tx.sessionOccurrence.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { attendanceRecords: true } } },
      });
      if (session._count.attendanceRecords > 0) {
        throw new ConflictException('Yoklamasi girilmis ders iptal edilemez');
      }
      const row = await tx.sessionOccurrence.update({
        where: { id },
        data: { isCancelled: true, cancelReason: dto.reason },
        include: SESSION_INCLUDE,
      });
      return (await presentSessions(tx, [row]))[0];
    });
  }

  restore(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.sessionOccurrence.update({
        where: { id },
        data: { isCancelled: false, cancelReason: null },
        include: SESSION_INCLUDE,
      });
      return (await presentSessions(tx, [row]))[0];
    });
  }

  /** Sadece yoklamasi girilmemis telafi dersi silinebilir; planli dersler iptal edilir. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const session = await tx.sessionOccurrence.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { attendanceRecords: true } } },
      });
      if (!session.isMakeup) {
        throw new ConflictException('Planli ders silinemez; POST /sessions/:id/cancel kullanin');
      }
      if (session._count.attendanceRecords > 0) {
        throw new ConflictException('Yoklamasi girilmis ders silinemez');
      }
      await tx.sessionOccurrence.delete({ where: { id } });
    });
  }

  roster(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), (tx) => buildRoster(tx, id));
  }

  /** Toplu yoklama (idempotent): ayni durum tekrar gonderilirse degisiklik/bildirim olmaz. */
  async mark(user: AuthenticatedUser, id: string, dto: MarkAttendanceDto) {
    const { roster, events } = await withTenant(toTenantContext(user), async (tx) => {
      const session = await loadOpenSession(tx, id);
      const members = await rosterStudentIds(tx, session);
      const seen = new Set<string>();
      for (const entry of dto.entries) {
        if (seen.has(entry.studentId)) {
          throw new BadRequestException(`Ogrenci listede birden fazla kez var: ${entry.studentId}`);
        }
        seen.add(entry.studentId);
      }
      const invalid = dto.entries.filter((e) => !members.has(e.studentId)).map((e) => e.studentId);
      if (invalid.length) {
        throw new BadRequestException(
          `Bu derse o tarihte kayitli olmayan ogrenci(ler): ${invalid.join(', ')}`,
        );
      }
      const events = await writeEntries(tx, user, session, dto.entries);
      return { roster: await buildRoster(tx, id), events };
    });
    this.emit(events);
    return roster;
  }

  /** "Hepsi geldi": varsayilan olarak sadece isaretlenmemis ogrencilere uygulanir. */
  async markAllPresent(user: AuthenticatedUser, id: string, query: AllPresentQueryDto) {
    const { roster, events } = await withTenant(toTenantContext(user), async (tx) => {
      const session = await loadOpenSession(tx, id);
      const members = await rosterStudentIds(tx, session);
      const marked = new Set(
        (
          await tx.attendanceRecord.findMany({
            where: { sessionOccurrenceId: id },
            select: { studentId: true },
          })
        ).map((r) => r.studentId),
      );
      const entries = [...members]
        .filter((studentId) => query.overwrite || !marked.has(studentId))
        .map((studentId) => ({ studentId, status: 'PRESENT' as const }));
      const events = await writeEntries(tx, user, session, entries);
      return { roster: await buildRoster(tx, id), events };
    });
    this.emit(events);
    return roster;
  }

  scan(user: AuthenticatedUser, id: string, token: string) {
    const studentId = this.qrTokens.decode(token);
    return this.mark(user, id, { entries: [{ studentId, status: 'PRESENT' }] });
  }

  /** Bildirimler transaction commit edildikten sonra yayinlanir (yarim kayda bildirim gitmez). */
  private emit(events: AttendanceAbsenceEvent[]) {
    for (const event of events) this.events.emit(ATTENDANCE_ABSENCE_EVENT, event);
  }
}

type OpenSession = { id: string; date: Date; schedule: { groupId: string; institutionId: string } };

async function loadOpenSession(tx: PrismaClient, id: string): Promise<OpenSession> {
  const session = await tx.sessionOccurrence.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      date: true,
      isCancelled: true,
      schedule: {
        select: {
          groupId: true,
          institutionId: true,
          startTime: true,
          isActive: true,
          startDate: true,
          endDate: true,
          breaks: true,
          dayOfWeek: true,
        },
      },
      isMakeup: true,
    },
  });
  if (session.isCancelled) throw new ConflictException('Iptal edilmis derse yoklama girilemez');
  if (
    !session.schedule.isActive ||
    (!session.isMakeup && !occursOn(session.schedule, session.date))
  )
    throw new ConflictException('Bu tarih için kayıtlı aktif ders yok.');
  assertAttendanceStarted(session.date, session.schedule.startTime);
  if (session.date > todayInTurkey()) {
    throw new BadRequestException('Gelecek tarihli derse yoklama girilemez');
  }
  return session;
}

async function rosterStudentIds(tx: PrismaClient, session: OpenSession) {
  const members = await tx.groupMembership.findMany({
    where: { groupId: session.schedule.groupId, ...membershipAt(session.date) },
    select: { studentId: true },
  });
  return new Set(members.map((m) => m.studentId));
}

async function writeEntries(
  tx: PrismaClient,
  user: AuthenticatedUser,
  session: OpenSession,
  entries: Pick<AttendanceEntryDto, 'studentId' | 'status' | 'note'>[],
): Promise<AttendanceAbsenceEvent[]> {
  if (entries.length === 0) return [];
  const existing = new Map(
    (
      await tx.attendanceRecord.findMany({
        where: {
          sessionOccurrenceId: session.id,
          studentId: { in: entries.map((e) => e.studentId) },
        },
      })
    ).map((r) => [r.studentId, r]),
  );
  const events: AttendanceAbsenceEvent[] = [];
  for (const entry of entries) {
    const before = existing.get(entry.studentId);
    const note = entry.note === undefined ? (before?.note ?? null) : entry.note;
    if (before && before.status === entry.status && before.note === note) continue;

    if (before) {
      await tx.attendanceRecord.update({
        where: { id: before.id },
        data: { status: entry.status, note, updatedById: user.userId },
      });
      // Kim, ne zaman, neyi degistirdi (append-only).
      await tx.auditLog.create({
        data: {
          institutionId: session.schedule.institutionId,
          actorId: user.userId,
          action: 'attendance.update',
          entityType: 'AttendanceRecord',
          entityId: before.id,
          before: { status: before.status, note: before.note },
          after: { status: entry.status, note },
        },
      });
    } else {
      await tx.attendanceRecord.create({
        data: {
          sessionOccurrenceId: session.id,
          studentId: entry.studentId,
          status: entry.status,
          note,
          markedById: user.userId,
        },
      });
    }

    const wasAbsent = before ? ABSENCE_STATUSES.includes(before.status) : false;
    if (ABSENCE_STATUSES.includes(entry.status) && !wasAbsent) {
      events.push(
        new AttendanceAbsenceEvent(
          session.schedule.institutionId,
          entry.studentId,
          entry.status,
          session.date,
        ),
      );
    }
  }
  return events;
}

async function buildRoster(tx: PrismaClient, id: string) {
  const session = await tx.sessionOccurrence.findUniqueOrThrow({
    where: { id },
    include: SESSION_INCLUDE,
  });
  const [members, records] = await Promise.all([
    tx.groupMembership.findMany({
      where: { groupId: session.schedule.group.id, ...membershipAt(session.date) },
      include: {
        student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    }),
    tx.attendanceRecord.findMany({ where: { sessionOccurrenceId: id } }),
  ]);
  const [presented] = await presentSessions(tx, [session]);
  const users = await userNames(
    tx,
    records.flatMap((r) => [r.markedById, r.updatedById]),
  );
  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  return {
    session: presented,
    summary: {
      ...summarize(records.map((r) => [r.status, 1] as const)),
      rosterSize: members.length,
      unmarked: members.filter((m) => !byStudent.has(m.studentId)).length,
    },
    students: members.map((m) => {
      const record = byStudent.get(m.studentId);
      return {
        student: {
          id: m.student.id,
          studentNumber: m.student.studentNumber,
          firstName: m.student.firstName,
          lastName: m.student.lastName,
          fullName: `${m.student.firstName} ${m.student.lastName}`,
        },
        record: record
          ? {
              id: record.id,
              status: record.status,
              statusLabel: STATUS_LABELS[record.status],
              note: record.note,
              markedAt: record.markedAt,
              markedBy: ref(record.markedById, users),
              updatedAt: record.updatedAt,
              updatedBy: ref(record.updatedById, users),
            }
          : null,
      };
    }),
  };
}

export async function presentSessions(tx: PrismaClient, rows: SessionRow[]) {
  const [teachers, institutions] = await Promise.all([
    userNames(
      tx,
      rows.map((r) => r.schedule.teacherId),
    ),
    institutionNames(
      tx,
      rows.map((r) => r.schedule.institutionId),
    ),
  ]);
  return rows.map((r) => ({
    id: r.id,
    date: formatDate(r.date),
    dayName: DAY_NAMES[mondayBasedDay(r.date)],
    startTime: r.schedule.startTime,
    endTime: r.schedule.endTime,
    classroom: r.schedule.classroom,
    isCancelled: r.isCancelled,
    cancelReason: r.cancelReason,
    isMakeup: r.isMakeup,
    scheduleId: r.schedule.id,
    group: r.schedule.group,
    course: r.schedule.course,
    teacher: ref(r.schedule.teacherId, teachers),
    institution: ref(r.schedule.institutionId, institutions),
    attendanceCount: r._count.attendanceRecords,
    attendanceTaken: r._count.attendanceRecords > 0,
    attendanceLocked:
      r.isCancelled ||
      !r.schedule.isActive ||
      (!r.isMakeup && !occursOn(r.schedule, r.date)) ||
      attendanceLock(r.date, r.schedule.startTime),
    attendanceOpensAt: `${formatDate(r.date)}T${r.schedule.startTime}:00+03:00`,
  }));
}
