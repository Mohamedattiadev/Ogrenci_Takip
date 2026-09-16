import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { attendanceLock, occursOn, validateCalendar, syncCalendar } from './calendar';
import type { PrismaClient } from '@yoklama/db';

describe('schedule calendar', () => {
  const calendar = {
    ...validateCalendar('2026-09-01', '2026-09-30', [
      { startDate: '2026-09-09', endDate: '2026-09-16' },
    ]),
    dayOfWeek: 2,
  };
  it('repeats on Wednesdays with inclusive holiday boundaries', () => {
    for (const [date, expected] of [
      ['2026-08-26', false],
      ['2026-09-02', true],
      ['2026-09-03', false],
      ['2026-09-09', false],
      ['2026-09-16', false],
      ['2026-09-23', true],
      ['2026-09-30', true],
      ['2026-10-07', false],
    ] as const)
      assert.equal(occursOn(calendar, new Date(date)), expected, date);
  });
  it('rejects inverted dates and holidays outside the lesson dates', () => {
    assert.throws(() => validateCalendar('2026-09-30', '2026-09-01', []));
    assert.throws(() =>
      validateCalendar('2026-09-01', '2026-09-30', [
        { startDate: '2026-08-31', endDate: '2026-09-02' },
      ]),
    );
    assert.throws(() =>
      validateCalendar('2026-09-01', '2026-09-30', [
        { startDate: '2026-09-29', endDate: '2026-10-01' },
      ]),
    );
    assert.throws(() =>
      validateCalendar('2026-09-01', '2026-09-30', [
        { startDate: '2026-09-15', endDate: '2026-09-14' },
      ]),
    );
  });
  it('opens at the precise Turkish start time regardless of server timezone', () => {
    const day = new Date('2026-09-16');
    assert.equal(attendanceLock(day, '19:00', new Date('2026-09-16T15:59:59.999Z')), true);
    assert.equal(attendanceLock(day, '19:00', new Date('2026-09-16T16:00:00Z')), false);
    assert.equal(attendanceLock(day, '19:00', new Date('2026-09-17T00:00:00Z')), false);
    assert.equal(attendanceLock(day, '00:00', new Date('2026-09-15T21:00:00Z')), false);
  });
  it('creates all selected dates while skipping breaks and public holidays', async () => {
    let rows: { date: Date }[] = [];
    const tx = {
      lessonSchedule: {
        findUniqueOrThrow: async () => ({ ...calendar, isActive: true, institutionId: 'i' }),
      },
      holiday: { findMany: async () => [{ date: new Date('2026-09-23') }] },
      sessionOccurrence: {
        findMany: async () => [],
        createMany: async (input: { data: typeof rows }) => {
          rows = input.data;
        },
      },
    } as unknown as PrismaClient;
    await syncCalendar(tx, 'schedule', true);
    assert.deepEqual(
      rows.map((r) => r.date.toISOString().slice(0, 10)),
      ['2026-09-02', '2026-09-30'],
    );
  });
  it('preserves marked sessions when an administrator changes the calendar', async () => {
    let removed: string[] = [];
    const tx = {
      lessonSchedule: { findUniqueOrThrow: async () => ({ ...calendar, isActive: false }) },
      holiday: { findMany: async () => [] },
      sessionOccurrence: {
        findMany: async () => [
          { id: 'marked', date: new Date('2099-01-01'), _count: { attendanceRecords: 1 } },
          { id: 'unmarked', date: new Date('2099-01-02'), _count: { attendanceRecords: 0 } },
        ],
        deleteMany: async (input: { where: { id: { in: string[] } } }) => {
          removed = input.where.id.in;
        },
      },
    } as unknown as PrismaClient;
    await syncCalendar(tx, 'schedule');
    assert.deepEqual(removed, ['unmarked']);
  });
});
