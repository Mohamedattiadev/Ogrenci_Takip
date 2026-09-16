import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, withTenant, type PrismaClient, type AttendanceStatus } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { STATUS_LABELS, summarize } from '../common/attendance-stats';
import { dateOnly, formatDate, todayInTurkey } from '../common/dates';
import { membershipAt } from '../common/memberships';
import { pageArgs, toPage } from '../common/pagination';
import {
  CATEGORIES,
  LABELS,
  aggregateStudents,
  analyticsRange,
  categoryCounts,
  series,
  studentCategory,
  type AggregateRow,
} from './analytics';
import type { AnalyticsDetailDto, AnalyticsQueryDto } from './analytics.dto';

/** RLS plus explicit role filters are shared by aggregates and drill-downs. */
@Injectable()
export class AnalyticsService {
  summary(user: AuthenticatedUser, query: AnalyticsQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const data = await load(tx, user, query);
      const counts = aggregateStudents(
        data.students.map((s) => s.id),
        data.rows,
      );
      const recordSummary = summarize(data.rows.map((r) => [r.status, r.count] as const));
      const buckets = { attended: 0, absent: 0, excused: 0, unrecorded: 0 };
      for (const value of counts.values()) buckets[studentCategory(value)]++;
      const personal = user.role === 'STUDENT';
      const distribution = personal ? categoryCounts(recordSummary.counts) : buckets;
      const denominator = personal ? recordSummary.total : data.students.length;
      const [todayLessons, teachers] = await Promise.all([
        tx.sessionOccurrence.count({
          where: {
            date: todayInTurkey(),
            isCancelled: false,
            schedule: {
              ...data.scheduleScope,
              ...(personal ? { groupId: { in: data.groups.map((g) => g.id) } } : {}),
              isActive: true,
              group: { deletedAt: null },
            },
          },
        }),
        tx.lessonSchedule.findMany({
          where: {
            ...data.scheduleScope,
            ...(personal ? { groupId: { in: data.groups.map((g) => g.id) } } : {}),
            isActive: true,
            group: { deletedAt: null },
          },
          select: { teacherId: true },
          distinct: ['teacherId'],
        }),
      ]);
      return {
        personal,
        from: data.range.from,
        to: data.range.to,
        counts: {
          students: data.students.length,
          groups: data.groups.length,
          teachers: teachers.length,
          todayLessons,
        },
        attendanceRate: recordSummary.attendanceRate,
        totalRecords: recordSummary.total,
        recordedStudents: data.students.length - buckets.unrecorded,
        distribution: CATEGORIES.filter((key) => !personal || key !== 'unrecorded').map((key) => ({
          key,
          label:
            personal && key === 'attended'
              ? 'Katıldı'
              : personal && key === 'absent'
                ? 'Devamsız'
                : LABELS[key],
          count: distribution[key],
          percent: denominator ? Math.round((distribution[key] / denominator) * 1000) / 10 : null,
        })),
        days: series(data.range.start, data.range.end, data.rows),
        groups: personal
          ? []
          : data.groups
              .map((g) => ({
                id: g.id,
                name: g.name,
                count: data.students.filter((s) => s.memberships.some((m) => m.groupId === g.id))
                  .length,
              }))
              .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr')),
      };
    });
  }

  details(user: AuthenticatedUser, query: AnalyticsDetailDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const range = analyticsRange(query.from, query.to);
      if (query.date && (query.date < range.from || query.date > range.to))
        throw new BadRequestException('Gün, seçilen tarih aralığında olmalı.');
      const data = await load(tx, user, query, query.date);
      const counts = aggregateStudents(
        data.students.map((s) => s.id),
        data.rows,
      );
      if (user.role === 'STUDENT') {
        const statuses: AttendanceStatus[] =
          query.category === 'attended'
            ? ['PRESENT', 'LATE']
            : query.category === 'absent'
              ? ['ABSENT', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED']
              : query.category === 'excused'
                ? ['EXCUSED']
                : query.category === 'unrecorded'
                  ? []
                  : (Object.keys(STATUS_LABELS) as AttendanceStatus[]);
        const where: Prisma.AttendanceRecordWhereInput = {
          studentId: { in: data.students.map((s) => s.id) },
          status: { in: statuses },
          sessionOccurrence: {
            ...data.sessionScope,
            schedule: {
              ...data.scheduleScope,
              ...(query.groupId ? { groupId: query.groupId } : {}),
              ...(query.search
                ? { course: { name: { contains: query.search.trim(), mode: 'insensitive' } } }
                : {}),
            },
          },
        };
        const [records, total] = await Promise.all([
          tx.attendanceRecord.findMany({
            where,
            ...pageArgs(query),
            orderBy: [{ sessionOccurrence: { date: 'desc' } }, { id: 'asc' }],
            select: {
              id: true,
              status: true,
              sessionOccurrence: {
                select: {
                  date: true,
                  schedule: { select: { course: { select: { name: true } }, startTime: true } },
                },
              },
            },
          }),
          tx.attendanceRecord.count({ where }),
        ]);
        return {
          kind: 'records',
          ...toPage(
            records.map((r) => ({
              id: r.id,
              date: formatDate(r.sessionOccurrence.date),
              name: r.sessionOccurrence.schedule.course.name,
              time: r.sessionOccurrence.schedule.startTime,
              status: STATUS_LABELS[r.status],
            })),
            total,
            query,
          ),
        };
      }
      const term = query.search?.trim().toLocaleLowerCase('tr');
      const matches = data.students.filter(
        (s) =>
          (!query.groupId || s.memberships.some((m) => m.groupId === query.groupId)) &&
          (query.category === 'all' ||
            (query.date && query.category === 'attended'
              ? categoryCounts(counts.get(s.id)!).attended > 0
              : studentCategory(counts.get(s.id)!) === query.category)) &&
          (!term ||
            `${s.firstName} ${s.lastName} ${s.studentNumber}`
              .toLocaleLowerCase('tr')
              .includes(term)),
      );
      return {
        kind: 'students',
        ...toPage(
          matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((s) => {
            const values = counts.get(s.id)!;
            const categories = categoryCounts(values);
            return {
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              studentNumber: s.studentNumber,
              institution: s.institution.name,
              groups: s.memberships.map((m) => m.group.name),
              category: studentCategory(values),
              attended: categories.attended,
              absent: categories.absent,
              excused: categories.excused,
              rate: summarize(Object.entries(values) as [AttendanceStatus, number][])
                .attendanceRate,
            };
          }),
          matches.length,
          query,
        ),
      };
    });
  }
}

export async function analyticsScope(
  tx: PrismaClient,
  user: AuthenticatedUser,
  institutionId?: string,
) {
  if (!['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'TEACHER', 'STUDENT'].includes(user.role))
    throw new ForbiddenException();
  const institution = user.role === 'INSTITUTION_ADMIN' ? user.institutionId : institutionId;
  if (
    user.role === 'INSTITUTION_ADMIN' &&
    (!institution || (institutionId && institutionId !== institution))
  )
    throw new ForbiddenException();
  const schedule: Prisma.LessonScheduleWhereInput = {
    ...(institution ? { institutionId: institution } : {}),
    ...(user.role === 'TEACHER' ? { teacherId: user.userId } : {}),
  };
  const member: Prisma.GroupMembershipWhereInput = {
    ...membershipAt(todayInTurkey()),
    group: {
      deletedAt: null,
      ...(user.role === 'TEACHER' ? { schedules: { some: { ...schedule, isActive: true } } } : {}),
    },
  };
  let ownId: string | undefined;
  if (user.role === 'STUDENT') {
    const account = await tx.user.findUnique({
      where: { id: user.userId },
      select: { studentId: true },
    });
    if (!account?.studentId) throw new ForbiddenException();
    ownId = account.studentId;
  }
  const student: Prisma.StudentWhereInput = {
    deletedAt: null,
    withdrawDate: null,
    ...(institution ? { institutionId: institution } : {}),
    ...(ownId ? { id: ownId } : {}),
    ...(user.role === 'TEACHER' ? { memberships: { some: member } } : {}),
  };
  return { schedule, student, member, institution, ownId };
}

async function load(
  tx: PrismaClient,
  user: AuthenticatedUser,
  query: AnalyticsQueryDto,
  day?: string,
) {
  const range = analyticsRange(query.from, query.to);
  const scope = await analyticsScope(tx, user, query.institutionId);
  const students = await tx.student.findMany({
    where: scope.student,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentNumber: true,
      institution: { select: { name: true } },
      memberships: {
        where: scope.member,
        select: { groupId: true, group: { select: { name: true } } },
      },
    },
  });
  const groups = await tx.group.findMany({
    where: {
      deletedAt: null,
      ...(scope.institution ? { institutionId: scope.institution } : {}),
      ...(user.role === 'TEACHER'
        ? { schedules: { some: { ...scope.schedule, isActive: true } } }
        : {}),
      ...(scope.ownId
        ? { memberships: { some: { studentId: scope.ownId, ...membershipAt(todayInTurkey()) } } }
        : {}),
    },
    select: { id: true, name: true },
  });
  const start = day ? dateOnly(day) : range.start;
  const end = day ? dateOnly(day) : range.end;
  const sessionScope: Prisma.SessionOccurrenceWhereInput = {
    date: { gte: start, lte: end },
    isCancelled: false,
    schedule: scope.schedule,
  };
  // Group in PostgreSQL; never download every attendance record just to draw charts.
  const rows = students.length
    ? await tx.$queryRaw<
        Array<{ studentId: string; date: string; status: AttendanceStatus; count: bigint }>
      >(Prisma.sql`
    SELECT a."studentId", to_char(o.date, 'YYYY-MM-DD') AS date, a.status, count(*) AS count
    FROM "AttendanceRecord" a JOIN "SessionOccurrence" o ON o.id = a."sessionOccurrenceId"
    JOIN "LessonSchedule" l ON l.id = o."scheduleId"
    WHERE a."studentId" IN (${Prisma.join(students.map((s) => s.id))}) AND o.date >= ${start} AND o.date <= ${end}
      AND NOT o."isCancelled"
      ${user.role === 'TEACHER' ? Prisma.sql`AND l."teacherId" = ${user.userId}` : Prisma.empty}
      ${scope.institution ? Prisma.sql`AND l."institutionId" = ${scope.institution}` : Prisma.empty}
    GROUP BY a."studentId", o.date, a.status
  `)
    : [];
  return {
    students,
    groups,
    range,
    sessionScope,
    scheduleScope: scope.schedule,
    rows: rows.map((r) => ({ ...r, count: Number(r.count) })) as AggregateRow[],
  };
}
