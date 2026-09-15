import { BadRequestException } from '@nestjs/common';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ders tarihleri gun hassasiyetindedir ve UTC gece yarisi olarak saklanir.
 * "2026-10-06" veya ISO zaman damgasi kabul edilir; saat kismi atilir.
 */
export function dateOnly(value: string | Date): Date {
  const parsed =
    value instanceof Date
      ? value
      : new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Gecersiz tarih: ${value}`);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/** Turkiye saatine gore bugunun tarihi (sunucu hangi saat diliminde calisirsa calissin). */
export function todayInTurkey(now = new Date()): Date {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** 0 = Pazartesi ... 6 = Pazar (LessonSchedule.dayOfWeek ile ayni) */
export function mondayBasedDay(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Kapsayici tarih araligi -> Prisma filtresi (bitis gunu dahil). */
export function dayRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const start = from ? dateOnly(from) : undefined;
  const end = to ? addDays(dateOnly(to), 1) : undefined;
  if (start && end && start >= end) {
    throw new BadRequestException('Baslangic tarihi bitis tarihinden sonra olamaz');
  }
  return { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
}

export const DAY_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];
