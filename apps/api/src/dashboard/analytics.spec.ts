import 'reflect-metadata';
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { PrismaClient } from '@yoklama/db';
import {
  aggregateStudents,
  analyticsRange,
  categoryCounts,
  series,
  studentCategory,
  type AggregateRow,
} from './analytics';
import { analyticsScope } from './analytics.service';

describe('dashboard statistics', () => {
  const records: AggregateRow[] = [
    { studentId: 'a', date: '2026-09-14', status: 'PRESENT', count: 2 },
    { studentId: 'a', date: '2026-09-14', status: 'ABSENT', count: 1 },
    { studentId: 'b', date: '2026-09-14', status: 'PRESENT', count: 1 },
    { studentId: 'b', date: '2026-09-15', status: 'EXCUSED', count: 1 },
    { studentId: 'c', date: '2026-09-14', status: 'LATE', count: 1 },
  ];
  it('counts each student once, including students without a record', () => {
    const counts = aggregateStudents(['a', 'b', 'c', 'd'], records);
    assert.deepEqual([...counts.values()].map(studentCategory), [
      'absent',
      'excused',
      'attended',
      'unrecorded',
    ]);
    assert.equal(categoryCounts(counts.get('a')!).absent, 1);
    assert.equal(categoryCounts(counts.get('a')!).attended, 2);
  });
  it('uses records for daily percentages and distinguishes missing data from zero attendance', () => {
    const days = series(new Date('2026-09-14'), new Date('2026-09-16'), records);
    assert.deepEqual(days, [
      { date: '2026-09-14', total: 5, rate: 80 },
      { date: '2026-09-15', total: 1, rate: 0 },
      { date: '2026-09-16', total: 0, rate: null },
    ]);
  });
  it('rejects inverted and unbounded date ranges', () => {
    assert.throws(() => analyticsRange('2026-09-30', '2026-09-01'));
    assert.throws(() => analyticsRange('2026-01-01', '2026-12-31'));
    assert.equal(analyticsRange('2026-09-01', '2026-09-30').to, '2026-09-30');
  });
});
describe('dashboard authorization scope', () => {
  const tx = {
    user: { findUnique: async () => ({ studentId: 'own-student' }) },
  } as unknown as PrismaClient;
  it('derives student identity from their account and ignores a different token student id', async () => {
    const scope = await analyticsScope(tx, {
      userId: 'account',
      role: 'STUDENT',
      institutionId: 'dorm',
      studentId: 'other-student',
    });
    assert.equal(scope.student.id, 'own-student');
  });
  it('restricts teachers to their schedules and current student memberships', async () => {
    const scope = await analyticsScope(tx, {
      userId: 'teacher',
      role: 'TEACHER',
      institutionId: 'home-dorm',
    });
    assert.equal(scope.schedule.teacherId, 'teacher');
    assert.ok(scope.student.memberships?.some);
    assert.equal(scope.schedule.institutionId, undefined); // a teacher may teach at several dormitories
  });
  it('rejects another dormitory for a dormitory admin', async () => {
    await assert.rejects(() =>
      analyticsScope(
        tx,
        { userId: 'admin', role: 'INSTITUTION_ADMIN', institutionId: 'own-dorm' },
        'other-dorm',
      ),
    );
    const scope = await analyticsScope(tx, {
      userId: 'admin',
      role: 'INSTITUTION_ADMIN',
      institutionId: 'own-dorm',
    });
    assert.equal(scope.student.institutionId, 'own-dorm');
  });
  it('fails closed if the student account has no linked student', async () => {
    const empty = { user: { findUnique: async () => null } } as unknown as PrismaClient;
    await assert.rejects(() =>
      analyticsScope(empty, { userId: 'account', role: 'STUDENT', institutionId: null }),
    );
  });
});
