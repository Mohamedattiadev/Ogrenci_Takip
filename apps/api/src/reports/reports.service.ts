import { Injectable } from '@nestjs/common';
import { withTenant, type AttendanceStatus, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import {
  ALL_STATUSES,
  STATUS_LABELS,
  attendanceRate,
  emptyCounts,
  formatRate,
  totalOf,
  type StatusCounts,
} from '../common/attendance-stats';
import {
  DAY_NAMES,
  addDays,
  dayRange,
  formatDate,
  mondayBasedDay,
  todayInTurkey,
} from '../common/dates';
import { institutionNames, userNames } from '../common/lookups';
import type { ReportRow } from './exporters/report-exporter.interface';
import type { ReportQueryDto, TopAbsenteesQueryDto } from './reports.dto';

export interface Report {
  title: string;
  columns: string[];
  rows: ReportRow[];
}

const COUNT_COLUMNS = ALL_STATUSES.map((status) => STATUS_LABELS[status]);

function countColumns(counts: StatusCounts): ReportRow {
  return Object.fromEntries(ALL_STATUSES.map((status) => [STATUS_LABELS[status], counts[status]]));
}

function scheduleFilter(query: ReportQueryDto): Prisma.LessonScheduleWhereInput {
  return {
    ...(query.institutionId ? { institutionId: query.institutionId } : {}),
    ...(query.groupId ? { groupId: query.groupId } : {}),
    ...(query.courseId ? { courseId: query.courseId } : {}),
    ...(query.teacherId ? { teacherId: query.teacherId } : {}),
  };
}

function recordWhere(query: ReportQueryDto): Prisma.AttendanceRecordWhereInput {
  return {
    sessionOccurrence: {
      date: dayRange(query.from, query.to),
      isCancelled: false,
      schedule: scheduleFilter(query),
    },
    ...(query.scholarshipProgramId
      ? { student: { scholarshipProgramId: query.scholarshipProgramId } }
      : {}),
  };
}

const RECORD_SELECT = {
  status: true,
  studentId: true,
  sessionOccurrenceId: true,
  sessionOccurrence: {
    select: {
      date: true,
      schedule: {
        select: {
          teacherId: true,
          institutionId: true,
          groupId: true,
          courseId: true,
          group: { select: { name: true } },
          course: { select: { name: true } },
        },
      },
    },
  },
} satisfies Prisma.AttendanceRecordSelect;

type RecordRow = Prisma.AttendanceRecordGetPayload<{ select: typeof RECORD_SELECT }>;

function tally<K>(records: RecordRow[], keyOf: (r: RecordRow) => K) {
  const buckets = new Map<K, { counts: StatusCounts; sessions: Set<string>; sample: RecordRow }>();
  for (const record of records) {
    const key = keyOf(record);
    const bucket = buckets.get(key) ?? {
      counts: emptyCounts(),
      sessions: new Set(),
      sample: record,
    };
    bucket.counts[record.status as AttendanceStatus] += 1;
    bucket.sessions.add(record.sessionOccurrenceId);
    buckets.set(key, bucket);
  }
  return buckets;
}

/**
 * Tum raporlar RLS altinda calisir: yurt yoneticisi kendi yurdunu, hoca sadece kendi
 * derslerini gorur. Devam yuzdesi = (Geldi + Gec geldi) / girilen kayit.
 */
@Injectable()
export class ReportsService {
  studentAttendance(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    return withTenant(toTenantContext(user), async (tx) => {
      const records = await tx.attendanceRecord.findMany({
        where: recordWhere(query),
        select: RECORD_SELECT,
      });
      const byStudent = tally(records, (r) => r.studentId);
      const narrowed = Boolean(query.groupId || query.courseId || query.teacherId);
      const students = await tx.student.findMany({
        where: narrowed
          ? { id: { in: [...byStudent.keys()] } }
          : {
              OR: [
                { id: { in: [...byStudent.keys()] } },
                {
                  deletedAt: null,
                  withdrawDate: null,
                  ...(query.institutionId ? { institutionId: query.institutionId } : {}),
                  ...(query.scholarshipProgramId
                    ? { scholarshipProgramId: query.scholarshipProgramId }
                    : {}),
                },
              ],
            },
        select: {
          id: true,
          studentNumber: true,
          firstName: true,
          lastName: true,
          institutionId: true,
          scholarshipProgram: { select: { name: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      const institutions = await institutionNames(
        tx,
        students.map((s) => s.institutionId),
      );
      return {
        title: 'Öğrenci Bazlı Devam Raporu',
        columns: [
          'Öğrenci No',
          'Ad Soyad',
          'Yurt',
          'Burs Programı',
          ...COUNT_COLUMNS,
          'Toplam Kayıt',
          'Devam Yüzdesi',
        ],
        rows: students.map((s) => {
          const counts = byStudent.get(s.id)?.counts ?? emptyCounts();
          return {
            'Öğrenci No': s.studentNumber,
            'Ad Soyad': `${s.firstName} ${s.lastName}`,
            Yurt: institutions.get(s.institutionId) ?? '',
            'Burs Programı': s.scholarshipProgram?.name ?? '',
            ...countColumns(counts),
            'Toplam Kayıt': totalOf(counts),
            'Devam Yüzdesi': formatRate(attendanceRate(counts)),
          };
        }),
      };
    });
  }

  groupAttendance(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    return this.aggregate(user, query, 'Grup Bazlı Yoklama Raporu', 'Grup', (r) => ({
      key: r.sessionOccurrence.schedule.groupId,
      label: r.sessionOccurrence.schedule.group.name,
    }));
  }

  courseAttendance(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    return this.aggregate(user, query, 'Ders Bazlı Yoklama Raporu', 'Ders', (r) => ({
      key: r.sessionOccurrence.schedule.courseId,
      label: r.sessionOccurrence.schedule.course.name,
    }));
  }

  /** Ogretmen bazli: planlanan/iptal/yoklamasi girilen-girilmeyen ders sayilari + devam yuzdesi. */
  teacherAttendance(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    const today = todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      const sessions = await tx.sessionOccurrence.findMany({
        where: { date: dayRange(query.from, query.to), schedule: scheduleFilter(query) },
        select: {
          date: true,
          isCancelled: true,
          schedule: { select: { teacherId: true } },
          attendanceRecords: { select: { status: true } },
        },
      });
      const byTeacher = new Map<
        string,
        {
          planned: number;
          cancelled: number;
          entered: number;
          missing: number;
          counts: StatusCounts;
        }
      >();
      for (const session of sessions) {
        const id = session.schedule.teacherId;
        const t = byTeacher.get(id) ?? {
          planned: 0,
          cancelled: 0,
          entered: 0,
          missing: 0,
          counts: emptyCounts(),
        };
        if (session.isCancelled) t.cancelled += 1;
        else {
          t.planned += 1;
          if (session.attendanceRecords.length > 0) t.entered += 1;
          else if (session.date <= today) t.missing += 1;
          for (const record of session.attendanceRecords) t.counts[record.status] += 1;
        }
        byTeacher.set(id, t);
      }
      const names = await userNames(tx, [...byTeacher.keys()]);
      const rows = [...byTeacher.entries()]
        .map(([id, t]) => ({
          Öğretmen: names.get(id) ?? '(gizli)',
          'Planlanan Ders': t.planned,
          'İptal Edilen': t.cancelled,
          'Yoklaması Girilen': t.entered,
          'Yoklaması Girilmeyen': t.missing,
          'Giriş Oranı': formatRate(
            t.entered + t.missing > 0
              ? Math.round((t.entered / (t.entered + t.missing)) * 1000) / 10
              : null,
          ),
          'Devam Yüzdesi': formatRate(attendanceRate(t.counts)),
        }))
        .sort((a, b) => a.Öğretmen.localeCompare(b.Öğretmen, 'tr'));
      return {
        title: 'Öğretmen Bazlı Ders ve Yoklama Raporu',
        columns: [
          'Öğretmen',
          'Planlanan Ders',
          'İptal Edilen',
          'Yoklaması Girilen',
          'Yoklaması Girilmeyen',
          'Giriş Oranı',
          'Devam Yüzdesi',
        ],
        rows,
      };
    });
  }

  async topAbsentees(user: AuthenticatedUser, query: TopAbsenteesQueryDto): Promise<Report> {
    const base = await this.studentAttendance(user, query);
    const absenceColumns = [STATUS_LABELS.ABSENT, STATUS_LABELS.ABSENT_EXCUSED];
    const rows = base.rows
      .map((row: ReportRow): ReportRow & { 'Toplam Devamsızlık': number } => ({
        ...row,
        'Toplam Devamsızlık': absenceColumns.reduce((sum, c) => sum + Number(row[c] ?? 0), 0),
      }))
      .filter((row) => row['Toplam Devamsızlık'] > 0)
      .sort(
        (a, b) =>
          b['Toplam Devamsızlık'] - a['Toplam Devamsızlık'] ||
          Number(b[STATUS_LABELS.ABSENT]) - Number(a[STATUS_LABELS.ABSENT]),
      )
      .slice(0, query.limit);
    return {
      title: 'En Fazla Devamsızlık Yapan Öğrenciler',
      columns: [...base.columns, 'Toplam Devamsızlık'],
      rows,
    };
  }

  /** Bugune kadar gerceklesmesi gereken, iptal edilmemis ve yoklamasi hic girilmemis dersler. */
  missingAttendance(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    const today = todayInTurkey();
    return withTenant(toTenantContext(user), async (tx) => {
      const sessions = await tx.sessionOccurrence.findMany({
        where: {
          AND: [{ date: dayRange(query.from, query.to) }, { date: { lte: today } }],
          isCancelled: false,
          attendanceRecords: { none: {} },
          schedule: scheduleFilter(query),
        },
        select: {
          date: true,
          isMakeup: true,
          schedule: {
            select: {
              startTime: true,
              endTime: true,
              teacherId: true,
              institutionId: true,
              group: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { schedule: { startTime: 'asc' } }],
      });
      const [teachers, institutions] = await Promise.all([
        userNames(
          tx,
          sessions.map((s) => s.schedule.teacherId),
        ),
        institutionNames(
          tx,
          sessions.map((s) => s.schedule.institutionId),
        ),
      ]);
      return {
        title: 'Yoklaması Girilmeyen Dersler',
        columns: ['Tarih', 'Gün', 'Saat', 'Ders', 'Grup', 'Yurt', 'Öğretmen', 'Telafi'],
        rows: sessions.map((s) => ({
          Tarih: formatDate(s.date),
          Gün: DAY_NAMES[mondayBasedDay(s.date)]!,
          Saat: `${s.schedule.startTime}-${s.schedule.endTime}`,
          Ders: s.schedule.course.name,
          Grup: s.schedule.group.name,
          Yurt: institutions.get(s.schedule.institutionId) ?? '',
          Öğretmen: teachers.get(s.schedule.teacherId) ?? '',
          Telafi: s.isMakeup ? 'Evet' : 'Hayır',
        })),
      };
    });
  }

  excusedAndLate(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    return withTenant(toTenantContext(user), async (tx) => {
      const records = await tx.attendanceRecord.findMany({
        where: { ...recordWhere(query), status: { in: ['EXCUSED', 'LATE', 'ABSENT_EXCUSED'] } },
        select: {
          status: true,
          note: true,
          student: { select: { studentNumber: true, firstName: true, lastName: true } },
          sessionOccurrence: {
            select: {
              date: true,
              schedule: {
                select: {
                  startTime: true,
                  group: { select: { name: true } },
                  course: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ sessionOccurrence: { date: 'desc' } }, { student: { lastName: 'asc' } }],
      });
      return {
        title: 'İzinli ve Geç Kalan Öğrenciler',
        columns: ['Tarih', 'Saat', 'Öğrenci No', 'Ad Soyad', 'Grup', 'Ders', 'Durum', 'Not'],
        rows: records.map((r) => ({
          Tarih: formatDate(r.sessionOccurrence.date),
          Saat: r.sessionOccurrence.schedule.startTime,
          'Öğrenci No': r.student.studentNumber,
          'Ad Soyad': `${r.student.firstName} ${r.student.lastName}`,
          Grup: r.sessionOccurrence.schedule.group.name,
          Ders: r.sessionOccurrence.schedule.course.name,
          Durum: STATUS_LABELS[r.status],
          Not: r.note ?? '',
        })),
      };
    });
  }

  /** Haftalik devam trendi (hafta Pazartesi baslar). */
  attendanceTrend(user: AuthenticatedUser, query: ReportQueryDto): Promise<Report> {
    return withTenant(toTenantContext(user), async (tx) => {
      const records = await tx.attendanceRecord.findMany({
        where: recordWhere(query),
        select: RECORD_SELECT,
      });
      const byWeek = tally(records, (r) =>
        formatDate(addDays(r.sessionOccurrence.date, -mondayBasedDay(r.sessionOccurrence.date))),
      );
      return {
        title: 'Haftalık Devam Trendi',
        columns: ['Hafta Başı', 'Ders Sayısı', 'Toplam Kayıt', ...COUNT_COLUMNS, 'Devam Yüzdesi'],
        rows: [...byWeek.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, bucket]) => ({
            'Hafta Başı': week,
            'Ders Sayısı': bucket.sessions.size,
            'Toplam Kayıt': totalOf(bucket.counts),
            ...countColumns(bucket.counts),
            'Devam Yüzdesi': formatRate(attendanceRate(bucket.counts)),
          })),
      };
    });
  }

  private aggregate(
    user: AuthenticatedUser,
    query: ReportQueryDto,
    title: string,
    label: string,
    keyOf: (r: RecordRow) => { key: string; label: string },
  ): Promise<Report> {
    return withTenant(toTenantContext(user), async (tx: PrismaClient) => {
      const records = await tx.attendanceRecord.findMany({
        where: recordWhere(query),
        select: RECORD_SELECT,
      });
      const buckets = tally(records, (r) => keyOf(r).key);
      const institutions = await institutionNames(
        tx,
        records.map((r) => r.sessionOccurrence.schedule.institutionId),
      );
      return {
        title,
        columns: [label, 'Yurt', 'Ders Sayısı', 'Toplam Kayıt', ...COUNT_COLUMNS, 'Devam Yüzdesi'],
        rows: [...buckets.values()]
          .map((bucket): ReportRow => ({
            [label]: keyOf(bucket.sample).label,
            Yurt: institutions.get(bucket.sample.sessionOccurrence.schedule.institutionId) ?? '',
            'Ders Sayısı': bucket.sessions.size,
            'Toplam Kayıt': totalOf(bucket.counts),
            ...countColumns(bucket.counts),
            'Devam Yüzdesi': formatRate(attendanceRate(bucket.counts)),
          }))
          .sort((a, b) => String(a[label]).localeCompare(String(b[label]), 'tr')),
      };
    });
  }
}
