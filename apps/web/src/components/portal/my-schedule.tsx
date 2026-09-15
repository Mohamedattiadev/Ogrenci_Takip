'use client';

import { WeeklyTimetable } from '@/components/schedule/weekly-timetable';
import { DAY_NAMES } from '@/lib/form';
import type { PortalSchedule } from '@/lib/portal-types';
import { formatDateTr } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { Badge, Card, ErrorNote, Loading, PageHeader, type Tone } from './ui';

interface Change {
  key: string;
  date: string;
  time: string;
  label: string;
  tone: Tone;
  text: string;
}

/** Tablodan farkli olan gunler: iptal, telafi ve tatil. */
function scheduleChanges(data: PortalSchedule): Change[] {
  const holidays = data.holidays.map((h) => ({
    key: `holiday-${h.date}`,
    date: h.date,
    time: '',
    label: 'Tatil',
    tone: 'accent' as const,
    text: h.description,
  }));
  const lessons = data.upcoming
    .filter((s) => s.isCancelled || s.isMakeup)
    .map((s) => ({
      key: s.id,
      date: s.date,
      time: s.startTime,
      label: s.isCancelled ? 'İptal' : 'Telafi',
      tone: s.isCancelled ? ('danger' as const) : ('info' as const),
      text: `${s.course.name}, ${s.startTime}–${s.endTime}${s.isCancelled && s.cancelReason ? ` (${s.cancelReason})` : ''}`,
    }));
  return [...holidays, ...lessons].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
}

function dayName(date: string) {
  return DAY_NAMES[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
}

export function MySchedule() {
  const { data, error } = useApi<PortalSchedule>('portal/schedule');
  const changes = data ? scheduleChanges(data) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Derslerim" description="Haftalık ders tablonuz ve hocalarınız" />
      <ErrorNote message={error} />

      <Card>
        {!data ? (
          <Loading />
        ) : (
          <WeeklyTimetable
            lessons={data.lessons}
            detail={(lesson) => lesson.teacher?.name}
            emptyLabel="Henüz bir derse kayıtlı değilsiniz."
          />
        )}
      </Card>

      {data ? (
        <Card title="Önümüzdeki iki haftadaki değişiklikler">
          {changes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              İptal, telafi veya tatil yok. Dersler tablodaki gibi yapılacak.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {changes.map((change) => (
                <li
                  key={change.key}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                >
                  <span className="w-36 shrink-0 text-neutral-500 tabular-nums dark:text-neutral-400">
                    {formatDateTr(change.date)} {dayName(change.date)}
                  </span>
                  <Badge tone={change.tone}>{change.label}</Badge>
                  <span className="text-neutral-800 dark:text-neutral-100">{change.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
