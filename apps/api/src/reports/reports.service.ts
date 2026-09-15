import { Injectable } from '@nestjs/common';
import { AttendanceStatus, withTenant, type TenantContext } from '@yoklama/db';
import type { ReportRow } from './exporters/report-exporter.interface';

@Injectable()
export class ReportsService {
  /** Ogrenci bazli devamsizlik ozeti: her ogrenci icin durum sayaclari + devam yuzdesi. */
  async studentAbsenceSummary(ctx: TenantContext, from: Date, to: Date): Promise<ReportRow[]> {
    return withTenant(ctx, async (tx) => {
      const students = await tx.student.findMany({ where: { deletedAt: null } });
      const records = await tx.attendanceRecord.findMany({
        where: { sessionOccurrence: { date: { gte: from, lte: to } } },
      });

      const byStudent = new Map<string, Record<AttendanceStatus, number>>();
      for (const record of records) {
        const counts =
          byStudent.get(record.studentId) ??
          ({
            PRESENT: 0,
            ABSENT: 0,
            EXCUSED: 0,
            LATE: 0,
            ABSENT_EXCUSED: 0,
            ABSENT_UNEXCUSED: 0,
          } satisfies Record<AttendanceStatus, number>);
        counts[record.status] += 1;
        byStudent.set(record.studentId, counts);
      }

      return students.map((student) => {
        const c = byStudent.get(student.id);
        const total = c ? Object.values(c).reduce((a, b) => a + b, 0) : 0;
        const attendanceRate = total > 0 ? Math.round(((c?.PRESENT ?? 0) / total) * 1000) / 10 : 0;
        return {
          'Öğrenci No': student.studentNumber,
          Ad: student.firstName,
          Soyad: student.lastName,
          Geldi: c?.PRESENT ?? 0,
          'Geç Geldi': c?.LATE ?? 0,
          İzinli: c?.EXCUSED ?? 0,
          'Haberli Devamsız': c?.ABSENT_EXCUSED ?? 0,
          'Habersiz Devamsız': c?.ABSENT_UNEXCUSED ?? 0,
          'Devam Yüzdesi': `%${attendanceRate}`,
        } satisfies ReportRow;
      });
    });
  }

  /** Yoklamasi hic girilmemis gecmis ders oturumlari - ogretmen takibi icin. */
  async missingAttendanceSessions(ctx: TenantContext, from: Date, to: Date): Promise<ReportRow[]> {
    return withTenant(ctx, async (tx) => {
      const occurrences = await tx.sessionOccurrence.findMany({
        where: { date: { gte: from, lte: to }, isCancelled: false },
        include: {
          schedule: { include: { course: true, group: true, teacher: true } },
          attendanceRecords: true,
        },
      });
      return occurrences
        .filter((o) => o.attendanceRecords.length === 0)
        .map(
          (o) =>
            ({
              Tarih: o.date.toLocaleDateString('tr-TR'),
              Ders: o.schedule.course.name,
              Grup: o.schedule.group.name,
              Öğretmen: o.schedule.teacher.fullName,
            }) satisfies ReportRow,
        );
    });
  }

  /** En fazla devamsizlik yapan ogrenciler - siralanmis, sinirlandirilmis liste. */
  async topAbsentees(
    ctx: TenantContext,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<ReportRow[]> {
    const summary = await this.studentAbsenceSummary(ctx, from, to);
    return summary
      .map((row) => ({
        ...row,
        _total: Number(row['Haberli Devamsız']) + Number(row['Habersiz Devamsız']),
      }))
      .sort((a, b) => b._total - a._total)
      .slice(0, limit)
      .map(({ _total, ...row }) => row);
  }

  /**
   * Gelismis analiz: haftalik devam yuzdesi trendi (grup bazli, opsiyonel).
   * Dashboard'daki "Haftalara Gore Devam Durumu" grafigi icin veri saglar.
   */
  async attendanceTrend(
    ctx: TenantContext,
    from: Date,
    to: Date,
    groupId?: string,
  ): Promise<ReportRow[]> {
    return withTenant(ctx, async (tx) => {
      const records = await tx.attendanceRecord.findMany({
        where: {
          sessionOccurrence: {
            date: { gte: from, lte: to },
            ...(groupId ? { schedule: { groupId } } : {}),
          },
        },
        include: { sessionOccurrence: true },
      });

      const byWeek = new Map<string, { present: number; total: number }>();
      for (const record of records) {
        const weekStart = startOfIsoWeek(record.sessionOccurrence.date);
        const key = weekStart.toISOString().slice(0, 10);
        const bucket = byWeek.get(key) ?? { present: 0, total: 0 };
        bucket.total += 1;
        if (record.status === 'PRESENT') bucket.present += 1;
        byWeek.set(key, bucket);
      }

      return [...byWeek.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([week, { present, total }]) =>
            ({
              Hafta: week,
              'Devam Yüzdesi': `%${total > 0 ? Math.round((present / total) * 1000) / 10 : 0}`,
            }) satisfies ReportRow,
        );
    });
  }

  /** Ogretmenlerin yoklama giris durumu: kac dersin yoklamasi girilmis / girilmemis. */
  async teacherAttendanceCompliance(
    ctx: TenantContext,
    from: Date,
    to: Date,
  ): Promise<ReportRow[]> {
    return withTenant(ctx, async (tx) => {
      const occurrences = await tx.sessionOccurrence.findMany({
        where: { date: { gte: from, lte: to }, isCancelled: false },
        include: { schedule: { include: { teacher: true } }, attendanceRecords: true },
      });

      const byTeacher = new Map<string, { name: string; entered: number; missing: number }>();
      for (const o of occurrences) {
        const teacher = o.schedule.teacher;
        const bucket = byTeacher.get(teacher.id) ?? {
          name: teacher.fullName,
          entered: 0,
          missing: 0,
        };
        if (o.attendanceRecords.length > 0) bucket.entered += 1;
        else bucket.missing += 1;
        byTeacher.set(teacher.id, bucket);
      }

      return [...byTeacher.values()].map(
        (t) =>
          ({
            Öğretmen: t.name,
            'Yoklaması Girilen': t.entered,
            'Yoklaması Girilmeyen': t.missing,
            'Giriş Oranı': `%${t.entered + t.missing > 0 ? Math.round((t.entered / (t.entered + t.missing)) * 1000) / 10 : 0}`,
          }) satisfies ReportRow,
      );
    });
  }
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (d.getUTCDay() + 6) % 7; // Pazartesi = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}
