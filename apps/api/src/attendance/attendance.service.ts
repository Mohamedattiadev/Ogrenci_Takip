import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceStatus, withTenant, type TenantContext } from '@yoklama/db';
import type { MarkAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto';
import {
  ATTENDANCE_ABSENCE_EVENT,
  AttendanceAbsenceEvent,
} from './events/attendance-absence.event';

const ABSENCE_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.ABSENT,
  AttendanceStatus.ABSENT_EXCUSED,
  AttendanceStatus.ABSENT_UNEXCUSED,
];

@Injectable()
export class AttendanceService {
  constructor(private readonly events: EventEmitter2) {}

  /**
   * Toplu yoklama girisi - "tumunu geldi isaretle" de ayni entry listesiyle
   * buraya gelir. Bir ogrenci ilk kez (ya da devamsizlik-disi bir durumdan)
   * devamsiz duruma geciyorsa veli bildirimi olayi yayinlanir (Observer) -
   * duzeltmede ayni durum tekrar yazilirsa spam bildirim gitmez.
   */
  async markBulk(ctx: TenantContext, dto: MarkAttendanceDto) {
    return withTenant(ctx, async (tx) => {
      const existing = await tx.attendanceRecord.findMany({
        where: { sessionOccurrenceId: dto.sessionOccurrenceId },
      });
      const existingByStudent = new Map(existing.map((r) => [r.studentId, r]));
      const occurrence = await tx.sessionOccurrence.findUniqueOrThrow({
        where: { id: dto.sessionOccurrenceId },
        include: { schedule: { select: { institutionId: true } } },
      });

      // Not: burada tx.$transaction(...) KULLANILMAZ - withTenant zaten bizi
      // bir transaction'in icine koydu (RLS SET LOCAL'in gecerli olmasi icin
      // sart), ve Prisma'nin interaktif transaction client'i kendi icinde
      // yeni bir $transaction acmaya izin vermez. Bu yuzden sirayla yaziyoruz;
      // hepsi zaten tek transaction icinde oldugu icin atomiklik korunur.
      const results = [];
      for (const entry of dto.entries) {
        results.push(
          await tx.attendanceRecord.upsert({
            where: {
              sessionOccurrenceId_studentId: {
                sessionOccurrenceId: dto.sessionOccurrenceId,
                studentId: entry.studentId,
              },
            },
            update: { status: entry.status, note: entry.note, updatedById: ctx.actorId },
            create: {
              sessionOccurrenceId: dto.sessionOccurrenceId,
              studentId: entry.studentId,
              status: entry.status,
              note: entry.note,
              markedById: ctx.actorId,
            },
          }),
        );
      }

      for (const entry of dto.entries) {
        const wasAbsent = ABSENCE_STATUSES.includes(
          existingByStudent.get(entry.studentId)?.status as never,
        );
        const isAbsent = ABSENCE_STATUSES.includes(entry.status);
        if (isAbsent && !wasAbsent) {
          this.events.emit(
            ATTENDANCE_ABSENCE_EVENT,
            new AttendanceAbsenceEvent(
              occurrence.schedule.institutionId,
              entry.studentId,
              entry.status,
              occurrence.date,
            ),
          );
        }
      }

      return results;
    });
  }

  /** Ogrenci karti/rozeti uzerindeki QR kod okutularak tek dokunusla "Geldi" isaretlemesi. */
  scanQr(ctx: TenantContext, sessionOccurrenceId: string, studentId: string) {
    return this.markBulk(ctx, {
      sessionOccurrenceId,
      entries: [{ studentId, status: AttendanceStatus.PRESENT }],
    });
  }

  /** Bir ders oturumu icin tam yoklama gorunumu: grubun o tarihteki tum uyeleri + varsa mevcut kayitlari. */
  async getForOccurrence(ctx: TenantContext, occurrenceId: string) {
    return withTenant(ctx, async (tx) => {
      const occurrence = await tx.sessionOccurrence.findUniqueOrThrow({
        where: { id: occurrenceId },
        include: { schedule: true },
      });
      const members = await tx.groupMembership.findMany({
        where: {
          groupId: occurrence.schedule.groupId,
          effectiveFrom: { lte: occurrence.date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: occurrence.date } }],
        },
        include: { student: true },
      });
      const records = await tx.attendanceRecord.findMany({
        where: { sessionOccurrenceId: occurrenceId },
      });
      const recordByStudent = new Map(records.map((r) => [r.studentId, r]));

      return {
        occurrence,
        roster: members.map((m) => ({
          student: m.student,
          record: recordByStudent.get(m.studentId) ?? null,
        })),
      };
    });
  }

  async updateOne(ctx: TenantContext, id: string, dto: UpdateAttendanceDto) {
    return withTenant(ctx, async (tx) => {
      const before = await tx.attendanceRecord.findUniqueOrThrow({
        where: { id },
        include: { sessionOccurrence: true },
      });
      const after = await tx.attendanceRecord.update({
        where: { id },
        data: { status: dto.status, note: dto.note, updatedById: ctx.actorId },
      });
      await tx.auditLog.create({
        data: {
          institutionId: ctx.institutionId,
          actorId: ctx.actorId,
          action: 'attendance.update',
          entityType: 'AttendanceRecord',
          entityId: id,
          before: { status: before.status, note: before.note },
          after: { status: after.status, note: after.note },
        },
      });

      const wasAbsent = ABSENCE_STATUSES.includes(before.status);
      const isAbsent = ABSENCE_STATUSES.includes(after.status);
      if (isAbsent && !wasAbsent && ctx.institutionId) {
        this.events.emit(
          ATTENDANCE_ABSENCE_EVENT,
          new AttendanceAbsenceEvent(
            ctx.institutionId,
            after.studentId,
            after.status,
            before.sessionOccurrence.date,
          ),
        );
      }

      return after;
    });
  }

  historyForStudent(ctx: TenantContext, studentId: string) {
    return withTenant(ctx, (tx) =>
      tx.attendanceRecord.findMany({
        where: { studentId },
        include: { sessionOccurrence: { include: { schedule: { include: { course: true } } } } },
        orderBy: { sessionOccurrence: { date: 'desc' } },
      }),
    );
  }
}
