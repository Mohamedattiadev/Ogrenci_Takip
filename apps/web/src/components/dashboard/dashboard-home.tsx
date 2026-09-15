'use client';

import { BookOpen, ClipboardCheck, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatStrip, type StatItem } from '@/components/dashboard/stat-strip';
import type { Dashboard } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

const ACTIVITY_TONES: Record<
  Dashboard['recentActivity'][number]['type'],
  { icon: LucideIcon; className: string }
> = {
  attendance: { icon: ClipboardCheck, className: 'bg-status-presentBg text-status-present' },
  student: { icon: UserPlus, className: 'bg-accent-50 text-accent-600' },
};

const relative = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' });

function timeAgo(value: string): string {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

function lessonState(lesson: Dashboard['today']['lessons'][number]) {
  if (!lesson.session) return { label: 'Oturum yok', className: 'bg-neutral-100 text-neutral-500' };
  if (lesson.session.isCancelled)
    return { label: 'İptal', className: 'bg-red-50 text-status-danger' };
  if (lesson.session.attendanceTaken) {
    return { label: 'Yoklama alındı', className: 'bg-status-presentBg text-status-present' };
  }
  return { label: 'Bekliyor', className: 'bg-status-lateBg text-status-late' };
}

export function DashboardHome() {
  const { data, loading, error } = useApi<Dashboard>('dashboard');
  const dash = '…';
  const stats: StatItem[] = [
    {
      label: 'Aktif Öğrenci',
      value: data ? String(data.stats.activeStudents) : dash,
      tone: 'brand',
    },
    {
      label: 'Aktif Öğretmen',
      value: data ? String(data.stats.activeTeachers) : dash,
      tone: 'accent',
    },
    { label: 'Aktif Grup', value: data ? String(data.stats.activeGroups) : dash, tone: 'success' },
    {
      label: 'Bugünkü Ders',
      value: data ? String(data.stats.todaysLessons) : dash,
      tone: 'warning',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900">Hoş geldiniz</h2>
        <p className="text-sm text-neutral-500">
          {data
            ? `Son 30 günde devam oranı ${data.stats.attendanceRateLast30Days === null ? '—' : `%${data.stats.attendanceRateLast30Days}`}, yoklaması girilmeyen ders: ${data.stats.missingAttendanceLast30Days}.`
            : 'Sistemin genel durumuna hızlı bir bakış.'}
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger"
        >
          {error}
        </p>
      ) : null}

      <StatStrip items={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900">
              Bugünkü Dersler{data ? ` · ${data.today.dayName}` : ''}
            </h3>
            {data?.today.holidays.length ? (
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-600">
                {data.today.holidays.map((h) => h.description).join(', ')}
              </span>
            ) : null}
          </div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  {['Ders', 'Grup', 'Öğretmen', 'Durum'].map((label) => (
                    <th
                      key={label}
                      className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-1 pb-2.5 text-right text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                    Saat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data && data.today.lessons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-1 py-6 text-center text-sm text-neutral-400">
                      Bugün planlanmış ders yok.
                    </td>
                  </tr>
                ) : null}
                {!data && loading ? (
                  <tr>
                    <td colSpan={5} className="px-1 py-6 text-center text-sm text-neutral-400">
                      Yükleniyor…
                    </td>
                  </tr>
                ) : null}
                {data?.today.lessons.map((lesson) => {
                  const state = lessonState(lesson);
                  return (
                    <tr key={lesson.scheduleId} className="hover:bg-neutral-50">
                      <td className="px-1 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                            <BookOpen size={14} strokeWidth={1.75} />
                          </span>
                          <span className="font-medium text-neutral-800">{lesson.course.name}</span>
                        </div>
                      </td>
                      <td className="px-1 py-3 text-neutral-600">{lesson.group.name}</td>
                      <td className="px-1 py-3 text-neutral-600">{lesson.teacher?.name ?? '—'}</td>
                      <td className="px-1 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            state.className,
                          )}
                        >
                          {state.label}
                        </span>
                      </td>
                      <td className="px-1 py-3 text-right text-neutral-600 [font-variant-numeric:tabular-nums]">
                        {lesson.startTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="font-display text-base font-bold text-neutral-900">Son Aktiviteler</h3>
          <ul className="-mx-1 flex flex-col divide-y divide-neutral-100">
            {data && data.recentActivity.length === 0 ? (
              <li className="px-1 py-3 text-sm text-neutral-400">Henüz aktivite yok.</li>
            ) : null}
            {data?.recentActivity.map((activity) => {
              const tone = ACTIVITY_TONES[activity.type];
              const Icon = tone.icon;
              return (
                <li
                  key={`${activity.type}-${activity.entityId}`}
                  className="flex items-start gap-3 px-1 py-3"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      tone.className,
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm text-neutral-700">{activity.text}</span>
                    <span className="text-xs text-neutral-400">{timeAgo(activity.at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
