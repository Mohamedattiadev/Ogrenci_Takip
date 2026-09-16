import type { AttendanceStatus } from '@yoklama/db';

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Geldi',
  LATE: 'Geç Geldi',
  EXCUSED: 'İzinli',
  ABSENT: 'Gelmedi',
  ABSENT_EXCUSED: 'Haberli Devamsız',
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as AttendanceStatus[];
export const ABSENCE_STATUSES: AttendanceStatus[] = ['ABSENT', 'ABSENT_EXCUSED'];
/** Devam yuzdesinde "derse katildi" sayilan durumlar. */
export const ATTENDED_STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE'];

export type StatusCounts = Record<AttendanceStatus, number>;

export function emptyCounts(): StatusCounts {
  return { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0, ABSENT_EXCUSED: 0 };
}

export function totalOf(counts: StatusCounts): number {
  return ALL_STATUSES.reduce((sum, status) => sum + counts[status], 0);
}

/** (Geldi + Gec geldi) / tum kayitlar, tek ondalik. Kayit yoksa null. */
export function attendanceRate(counts: StatusCounts): number | null {
  const total = totalOf(counts);
  if (total === 0) return null;
  const attended = ATTENDED_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  return Math.round((attended / total) * 1000) / 10;
}

export function summarize(pairs: Iterable<readonly [AttendanceStatus, number]>) {
  const counts = emptyCounts();
  for (const [status, count] of pairs) counts[status] += count;
  return { total: totalOf(counts), counts, attendanceRate: attendanceRate(counts) };
}

export function formatRate(rate: number | null): string {
  return rate === null ? '-' : `%${rate}`;
}
