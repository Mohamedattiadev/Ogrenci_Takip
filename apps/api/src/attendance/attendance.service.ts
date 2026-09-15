import { ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { ABSENCE_STATUSES, STATUS_LABELS } from '../common/attendance-stats';
import { dayRange, formatDate } from '../common/dates';
import { institutionNames, ref, userNames } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { AttendanceQueryDto, UpdateAttendanceDto } from './dto/attendance.dto';
import {
  ATTENDANCE_ABSENCE_EVENT,
  AttendanceAbsenceEvent,
} from './events/attendance-absence.event';

const RECORD_INCLUDE = {
  student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
  sessionOccurrence: {
    select: {
      id: true,
      date: true,
      isCancelled: true,
      isMakeup: true,
      schedule: {
        select: {
          startTime: true,
          endTime: true,
          teacherId: true,
          institutionId: true,
          group: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.AttendanceRecordInclude;

type RecordRow = Prisma.AttendanceRecordGetPayload<{ include: typeof RECORD_INCLUDE }>;

/** Yoklama kayitlari uzerinde sorgu ve tekil duzeltme. Oturum bazli giris: /sessions/:id/attendance */
@Injectable()
export class AttendanceService {
  constructor(private readonly events: EventEmitter2) {}

  list(user: AuthenticatedUser, query: AttendanceQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const terms = query.search?.trim().split(/\s+/).filter(Boolean) ?? [];
      const where: Prisma.AttendanceRecordWhereInput = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.sessionId ? { sessionOccurrenceId: query.sessionId } : {}),
        sessionOccurrence: {
          ...(query.from || query.to ? { date: dayRange(query.from, query.to) } : {}),
          schedule: {
            ...(query.institutionId ? { institutionId: query.institutionId } : {}),
            ...(query.groupId ? { groupId: query.groupId } : {}),
            ...(query.courseId ? { courseId: query.courseId } : {}),
            ...(query.teacherId ? { teacherId: query.teacherId } : {}),
          },
        },
        ...(terms.length
          ? {
              AND: terms.map((term) => ({
                OR: [
                  { student: { firstName: contains(term) } },
                  { student: { lastName: contains(term) } },
                  { student: { studentNumber: contains(term) } },
                ],
              })),
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.attendanceRecord.findMany({
          where,
          include: RECORD_INCLUDE,
          orderBy: [
            { sessionOccurrence: { date: 'desc' } },
            { student: { lastName: 'asc' } },
            { student: { firstName: 'asc' } },
          ],
          ...pageArgs(query),
        }),
        tx.attendanceRecord.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(
      toTenantContext(user),
      async (tx) =>
        (
          await present(tx, [
            await tx.attendanceRecord.findUniqueOrThrow({ where: { id }, include: RECORD_INCLUDE }),
          ])
        )[0],
    );
  }

  /** Sonradan duzeltme; kim/ne zaman/onceki-sonraki deger AuditLog'a yazilir. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateAttendanceDto) {
    const { record, event } = await withTenant(toTenantContext(user), async (tx) => {
      const before = await tx.attendanceRecord.findUniqueOrThrow({
        where: { id },
        include: RECORD_INCLUDE,
      });
      if (before.sessionOccurrence.isCancelled) {
        throw new ConflictException('Iptal edilmis dersin yoklamasi duzenlenemez');
      }
      const note = dto.note === undefined ? before.note : dto.note;
      const institutionId = before.sessionOccurrence.schedule.institutionId;
      let event: AttendanceAbsenceEvent | null = null;
      if (before.status !== dto.status || before.note !== note) {
        await tx.attendanceRecord.update({
          where: { id },
          data: { status: dto.status, note, updatedById: user.userId },
        });
        await tx.auditLog.create({
          data: {
            institutionId,
            actorId: user.userId,
            action: 'attendance.update',
            entityType: 'AttendanceRecord',
            entityId: id,
            before: { status: before.status, note: before.note },
            after: { status: dto.status, note },
          },
        });
        if (ABSENCE_STATUSES.includes(dto.status) && !ABSENCE_STATUSES.includes(before.status)) {
          event = new AttendanceAbsenceEvent(
            institutionId,
            before.studentId,
            dto.status,
            before.sessionOccurrence.date,
          );
        }
      }
      const after = await tx.attendanceRecord.findUniqueOrThrow({
        where: { id },
        include: RECORD_INCLUDE,
      });
      return { record: (await present(tx, [after]))[0], event };
    });
    if (event) this.events.emit(ATTENDANCE_ABSENCE_EVENT, event);
    return record;
  }

  /** Kaydin degisiklik gecmisi: ilk giris + her duzeltme. */
  history(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const record = await tx.attendanceRecord.findUniqueOrThrow({ where: { id } });
      const logs = await tx.auditLog.findMany({
        where: { entityType: 'AttendanceRecord', entityId: id },
        orderBy: { createdAt: 'asc' },
      });
      const users = await userNames(tx, [record.markedById, ...logs.map((l) => l.actorId)]);
      return {
        recordId: id,
        created: { at: record.markedAt, by: ref(record.markedById, users) },
        changes: logs.map((log) => ({
          at: log.createdAt,
          by: ref(log.actorId, users),
          before: log.before,
          after: log.after,
        })),
      };
    });
  }
}

async function present(tx: PrismaClient, rows: RecordRow[]) {
  const [users, institutions] = await Promise.all([
    userNames(
      tx,
      rows.flatMap((r) => [r.markedById, r.updatedById, r.sessionOccurrence.schedule.teacherId]),
    ),
    institutionNames(
      tx,
      rows.map((r) => r.sessionOccurrence.schedule.institutionId),
    ),
  ]);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    statusLabel: STATUS_LABELS[r.status],
    note: r.note,
    student: {
      ...r.student,
      fullName: `${r.student.firstName} ${r.student.lastName}`,
    },
    session: {
      id: r.sessionOccurrence.id,
      date: formatDate(r.sessionOccurrence.date),
      startTime: r.sessionOccurrence.schedule.startTime,
      endTime: r.sessionOccurrence.schedule.endTime,
      isMakeup: r.sessionOccurrence.isMakeup,
    },
    group: r.sessionOccurrence.schedule.group,
    course: r.sessionOccurrence.schedule.course,
    teacher: ref(r.sessionOccurrence.schedule.teacherId, users),
    institution: ref(r.sessionOccurrence.schedule.institutionId, institutions),
    markedAt: r.markedAt,
    markedBy: ref(r.markedById, users),
    updatedAt: r.updatedAt,
    updatedBy: ref(r.updatedById, users),
  }));
}
