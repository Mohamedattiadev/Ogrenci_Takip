'use client';

import Link from 'next/link';
import { BookOpen, ClipboardCheck, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnalyticsPanel } from './analytics-panel';
import type { Dashboard } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

const ACTIVITY_TONES: Record<
  Dashboard['recentActivity'][number]['type'],
  { icon: LucideIcon; className: string }
> = {
  attendance: {
    icon: ClipboardCheck,
    className: 'bg-status-presentBg text-status-present dark:bg-status-present/15',
  },
  student: {
    icon: UserPlus,
    className: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  },
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
  if (!lesson.session) {
    return {
      label: 'Oturum yok',
      className: 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400',
    };
  }
  if (lesson.session.isCancelled) {
    return { label: 'İptal', className: 'bg-red-50 text-status-danger dark:bg-red-950/40' };
  }
  if (lesson.session.attendanceTaken) {
    return {
      label: 'Yoklama alındı',
      className: 'bg-status-presentBg text-status-present dark:bg-status-present/15',
    };
  }
  if (lesson.session.attendanceLocked) {
    return {
      label: 'Henüz açılmadı',
      className: 'bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400',
    };
  }
  return {
    label: 'Bekliyor',
    className: 'bg-status-lateBg text-status-late dark:bg-status-late/15',
  };
}

const TH =
  'px-1 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500';
const CARD =
  'flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900';

export function DashboardHome() {
  const { data, loading, error } = useApi<Dashboard>('dashboard');

  return (
    <div className="flex flex-col gap-6">
      <AnalyticsPanel />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
        >
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn(CARD, 'gap-4 lg:col-span-2')}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
              Bugünkü Dersler{data ? ` · ${data.today.dayName}` : ''}
            </h3>
            {data?.today.holidays.length ? (
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
                {data.today.holidays.map((h) => h.description).join(', ')}
              </span>
            ) : null}
          </div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  {['Ders', 'Grup', 'Öğretmen', 'Durum'].map((label) => (
                    <th key={label} className={TH}>
                      {label}
                    </th>
                  ))}
                  <th className={cn(TH, 'text-right')}>Saat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data && data.today.lessons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-1 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500"
                    >
                      Bugün planlanmış ders yok.
                    </td>
                  </tr>
                ) : null}
                {!data && loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-1 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500"
                    >
                      Yükleniyor…
                    </td>
                  </tr>
                ) : null}
                {data?.today.lessons.map((lesson) => {
                  const state = lessonState(lesson);
                  return (
                    <tr
                      key={lesson.scheduleId}
                      className="hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-1 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                            <BookOpen size={14} strokeWidth={1.75} />
                          </span>
                          <span className="font-medium text-neutral-800 dark:text-neutral-100">
                            {lesson.course.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-1 py-3 text-neutral-600 dark:text-neutral-300">
                        {lesson.group.name}
                      </td>
                      <td className="px-1 py-3 text-neutral-600 dark:text-neutral-300">
                        {lesson.teacher?.name ?? '—'}
                      </td>
                      <td className="px-1 py-3">
                        {lesson.session && !lesson.session.isCancelled ? (
                          <Link
                            href={`/dashboard/attendance/${lesson.session.id}`}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold hover:opacity-80',
                              state.className,
                            )}
                          >
                            {state.label}
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              state.className,
                            )}
                          >
                            {state.label}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-3 text-right text-neutral-600 [font-variant-numeric:tabular-nums] dark:text-neutral-300">
                        {lesson.startTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={cn(CARD, 'gap-3')}>
          <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
            Son Aktiviteler
          </h3>
          <ul className="-mx-1 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {data && data.recentActivity.length === 0 ? (
              <li className="px-1 py-3 text-sm text-neutral-400 dark:text-neutral-500">
                Henüz aktivite yok.
              </li>
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
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {activity.text}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {timeAgo(activity.at)}
                    </span>
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
