'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { StatStrip } from '@/components/dashboard/stat-strip';
import { AnalyticsPanel } from '@/components/dashboard/analytics-panel';
import { useLiveEvents } from '@/lib/live';
import type {
  PortalAssignmentSummary,
  PortalAttendance,
  PortalProfile,
  PortalSchedule,
} from '@/lib/portal-types';
import { formatDateTime } from '@/lib/portal-types';
import { formatDateTr } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { Badge, Card, Empty, ErrorNote, HOMEWORK_LABEL, Loading, PageHeader, rateText } from './ui';

export function StudentHome() {
  const profile = useApi<PortalProfile>('portal/profile');
  const schedule = useApi<PortalSchedule>('portal/schedule');
  const attendance = useApi<PortalAttendance>('portal/attendance');
  const assignments = useApi<PortalAssignmentSummary[]>('portal/assignments');
  const reloadAssignments = assignments.reload;

  useLiveEvents(
    useCallback(
      (event) => {
        if (event.type.startsWith('assignment.')) reloadAssignments();
      },
      [reloadAssignments],
    ),
  );

  const pending = (assignments.data ?? []).filter((a) => a.status === 'PENDING');
  const upcoming = (schedule.data?.upcoming ?? []).slice(0, 6);
  const alert = attendance.data?.alert;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={profile.data ? `Merhaba, ${profile.data.firstName}` : 'Hoş geldiniz'}
        description={
          profile.data
            ? `${profile.data.institution?.name ?? ''} · ${profile.data.scholarshipProgram?.name ?? 'Burs programı atanmamış'}`
            : undefined
        }
      />
      <ErrorNote
        message={profile.error ?? schedule.error ?? attendance.error ?? assignments.error}
      />

      {alert && (alert.reached || alert.nearing) ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            {alert.reached
              ? `Habersiz devamsızlığınız ${alert.unexcusedAbsences} oldu (sınır ${alert.threshold}). Lütfen hocanızla veya yurt yönetimiyle görüşün.`
              : `Habersiz devamsızlığınız ${alert.unexcusedAbsences}. Bir devamsızlık daha sınıra (${alert.threshold}) ulaşmanıza neden olacak.`}
          </p>
        </div>
      ) : null}

      <StatStrip
        items={[
          {
            label: 'Devam Oranı',
            value: rateText(attendance.data?.summary.attendanceRate),
            tone: 'success',
          },
          {
            label: 'Haftalık Ders',
            value: String(schedule.data?.lessons.length ?? '…'),
            tone: 'brand',
          },
          {
            label: 'Bekleyen Ödev',
            value: String(assignments.data ? pending.length : '…'),
            tone: 'warning',
          },
          {
            label: 'Habersiz Devamsızlık',
            value: String(attendance.data?.alert.unexcusedAbsences ?? '…'),
            tone: 'accent',
          },
        ]}
      />

      <AnalyticsPanel />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Yaklaşan Dersler"
          action={
            <Link
              href="/dashboard/my-schedule"
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Ders tablosu
            </Link>
          }
        >
          {!schedule.data ? (
            <Loading />
          ) : upcoming.length === 0 ? (
            <Empty>Önümüzdeki iki haftada planlanmış ders yok.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {upcoming.map((lesson) => (
                <li key={lesson.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    <BookOpen size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {lesson.course.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTr(lesson.date)} {lesson.dayName} · {lesson.startTime}–
                      {lesson.endTime}
                      {lesson.teacher?.name ? ` · ${lesson.teacher.name}` : ''}
                    </p>
                  </div>
                  {lesson.isCancelled ? (
                    <Badge tone="danger">İptal</Badge>
                  ) : lesson.isMakeup ? (
                    <Badge tone="info">Telafi</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Bekleyen Ödevler"
          action={
            <Link
              href="/dashboard/my-assignments"
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Tüm ödevler
            </Link>
          }
        >
          {!assignments.data ? (
            <Loading />
          ) : pending.length === 0 ? (
            <Empty>Bekleyen ödeviniz yok.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {pending.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/my-assignments/${a.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {a.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {a.course.name} ·{' '}
                        {a.dueAt ? `Son teslim ${formatDateTime(a.dueAt)}` : 'Süresiz'}
                      </p>
                    </div>
                    <Badge tone={HOMEWORK_LABEL[a.status].tone}>
                      {HOMEWORK_LABEL[a.status].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
