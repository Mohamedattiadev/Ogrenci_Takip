import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaClient } from '@yoklama/db';
import { addDays, dateOnly, formatDate, mondayBasedDay, todayInTurkey } from '../common/dates';

export interface BreakRange {
  startDate: string;
  endDate: string;
}
export interface CalendarSlot {
  startDate: Date | null;
  endDate: Date | null;
  breaks: unknown;
  dayOfWeek: number;
}
export function breakRanges(value: unknown): BreakRange[] {
  return Array.isArray(value) ? (value as BreakRange[]) : [];
}
export function validateCalendar(start: string | Date, end: string | Date, breaks: BreakRange[]) {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  if (endDate < startDate) throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz.');
  if (endDate.getTime() - startDate.getTime() > 3660 * 86400000)
    throw new BadRequestException('Ders aralığı en fazla 10 yıl olabilir.');
  for (const range of breaks) {
    const a = dateOnly(range.startDate);
    const b = dateOnly(range.endDate);
    if (a > b || a < startDate || b > endDate)
      throw new BadRequestException('Ara tatil başlangıç ve bitişi ders tarihleri içinde olmalı.');
  }
  return { startDate, endDate, breaks: breaks.map((b) => ({ ...b })) };
}
export function occursOn(slot: CalendarSlot, day: Date) {
  const key = formatDate(day);
  return (
    (!slot.startDate || day >= dateOnly(slot.startDate)) &&
    (!slot.endDate || day <= dateOnly(slot.endDate)) &&
    mondayBasedDay(day) === slot.dayOfWeek &&
    !breakRanges(slot.breaks).some((b) => key >= b.startDate && key <= b.endDate)
  );
}
export function attendanceLock(date: Date, startTime: string, now = new Date()) {
  return now.getTime() < new Date(`${formatDate(date)}T${startTime}:00+03:00`).getTime();
}
export function assertAttendanceStarted(date: Date, startTime: string) {
  if (attendanceLock(date, startTime))
    throw new ConflictException('Ders başlamadan yoklama alınamaz.');
}

/** Only replace unmarked future planned sessions; retain history and manual cancellations. */
export async function syncCalendar(tx: PrismaClient, scheduleId: string, initial = false) {
  const slot = await tx.lessonSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
  if (!slot.startDate || !slot.endDate) return;
  const today = todayInTurkey();
  const holidays = await tx.holiday.findMany({
    where: {
      date: { gte: slot.startDate, lte: slot.endDate },
      OR: [{ institutionId: slot.institutionId }, { institutionId: null }],
    },
  });
  const holidayDays = new Set(holidays.map((h) => formatDate(h.date)));
  const wanted = new Map<string, Date>();
  const from = initial || slot.startDate > today ? slot.startDate : today;
  if (slot.isActive)
    for (let day = from; day <= slot.endDate; day = addDays(day, 1)) {
      if (occursOn(slot, day) && !holidayDays.has(formatDate(day)))
        wanted.set(formatDate(day), day);
    }
  const existing = await tx.sessionOccurrence.findMany({
    where: {
      scheduleId,
      date: { gte: today },
      isMakeup: false,
    },
    include: { _count: { select: { attendanceRecords: true } } },
  });
  const obsolete = existing.filter(
    (s) => !wanted.has(formatDate(s.date)) && !s._count.attendanceRecords,
  );
  if (obsolete.length)
    await tx.sessionOccurrence.deleteMany({
      where: { id: { in: obsolete.map((s) => s.id) }, attendanceRecords: { none: {} } },
    });
  if (wanted.size)
    await tx.sessionOccurrence.createMany({
      data: [...wanted.values()].map((date) => ({ scheduleId, date })),
      skipDuplicates: true,
    });
}
