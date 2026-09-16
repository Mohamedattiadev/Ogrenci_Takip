import { BadRequestException } from '@nestjs/common';
import type { AttendanceStatus } from '@yoklama/db';
import { emptyCounts, summarize, type StatusCounts } from '../common/attendance-stats';
import { addDays, dateOnly, formatDate, mondayBasedDay, todayInTurkey } from '../common/dates';

export const CATEGORIES = ['attended', 'absent', 'excused', 'unrecorded'] as const;
export type Category = (typeof CATEGORIES)[number];
export const LABELS: Record<Category, string> = {
  attended: 'Katılım tam',
  absent: 'Devamsızlık var',
  excused: 'İzinli',
  unrecorded: 'Yoklama kaydı yok',
};
export function categoryCounts(counts: StatusCounts) {
  return {
    attended: counts.PRESENT + counts.LATE,
    absent: counts.ABSENT + counts.ABSENT_EXCUSED,
    excused: counts.EXCUSED,
    unrecorded: 0,
  };
}
/** Mutually exclusive student buckets: absence, then leave, then attendance, then no record. */
export function studentCategory(counts: StatusCounts): Category {
  const c = categoryCounts(counts);
  return c.absent ? 'absent' : c.excused ? 'excused' : c.attended ? 'attended' : 'unrecorded';
}
export function analyticsRange(from?: string, to?: string) {
  const today = todayInTurkey();
  const start = from ? dateOnly(from) : addDays(today, -mondayBasedDay(today));
  const end = to ? dateOnly(to) : addDays(start, 6);
  if (end < start || end.getTime() - start.getTime() > 30 * 86400000)
    throw new BadRequestException('En fazla 31 günlük, geçerli bir tarih aralığı seçin.');
  return { start, end, from: formatDate(start), to: formatDate(end) };
}
export interface AggregateRow {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  count: number;
}
export function aggregateStudents(ids: string[], rows: AggregateRow[]) {
  const result = new Map(ids.map((id) => [id, emptyCounts()]));
  for (const row of rows) {
    const counts = result.get(row.studentId);
    if (counts) counts[row.status] += row.count;
  }
  return result;
}
export function series(from: Date, to: Date, rows: AggregateRow[]) {
  const byDate = new Map<string, StatusCounts>();
  for (const row of rows) {
    const counts = byDate.get(row.date) ?? emptyCounts();
    counts[row.status] += row.count;
    byDate.set(row.date, counts);
  }
  const days = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const key = formatDate(date);
    const summary = summarize(
      Object.entries(byDate.get(key) ?? emptyCounts()) as [AttendanceStatus, number][],
    );
    days.push({ date: key, total: summary.total, rate: summary.attendanceRate });
  }
  return days;
}
