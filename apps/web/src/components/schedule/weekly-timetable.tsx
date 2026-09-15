'use client';

import { useSyncExternalStore } from 'react';
import { DAY_NAMES } from '@/lib/form';
import { cn } from '@/lib/utils';

export interface TimetableLesson {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  course: { id: string; name: string };
}

/**
 * Haftalik ders tablosu: sutunlar gunler, satirlar ders saatleri. Hucrede yalnizca ders adi ve
 * (hucre yeterince genisse) hoca/grup yazar; derslik ve tam saat fareyle ustune gelince gorunur.
 * Hafta ici her zaman, hafta sonu yalnizca dersi varsa gosterilir. Dar ekranda gun gun listelenir.
 */
export function WeeklyTimetable<T extends TimetableLesson>({
  lessons,
  detail,
  emptyLabel = 'Ders tablosu boş.',
}: {
  lessons: T[];
  /** Ders adinin altindaki satir (hoca veya grup). */
  detail?: (lesson: T) => string | null | undefined;
  emptyLabel?: string;
}) {
  const minute = useMinute();

  if (lessons.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {emptyLabel}
      </p>
    );
  }

  const now = minute === null ? null : new Date(minute * 60_000);
  const today = now ? (now.getDay() + 6) % 7 : null;
  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : null;
  const isLive = (l: T) =>
    l.dayOfWeek === today && clock !== null && l.startTime <= clock && clock < l.endTime;

  const sorted = [...lessons].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.startTime.localeCompare(b.startTime) ||
      a.course.name.localeCompare(b.course.name, 'tr'),
  );
  const slots = [
    ...new Map(sorted.map((l) => [slotKey(l), { start: l.startTime, end: l.endTime }])).values(),
  ].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const days = [0, 1, 2, 3, 4, ...[5, 6].filter((d) => sorted.some((l) => l.dayOfWeek === d))];

  // Ayni ders her yerde ayni renkte; komsu dersler farkli tonda olsun diye ada gore sirali atanir.
  const courseIds = [...new Map(sorted.map((l) => [l.course.id, l.course.name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
    .map(([id]) => id);
  const toneOf = (l: T) => TONES[courseIds.indexOf(l.course.id) % TONES.length];

  const block = (l: T) => (
    <LessonBlock
      key={l.id}
      name={l.course.name}
      detail={detail?.(l) ?? null}
      hint={[l.course.name, detail?.(l), `${l.startTime}–${l.endTime}`, l.classroom]
        .filter(Boolean)
        .join('\n')}
      tone={toneOf(l)}
      live={isLive(l)}
    />
  );

  return (
    <>
      <table className="hidden w-full table-fixed border-separate border-spacing-0 text-left md:table">
        <caption className="sr-only">Haftalık ders tablosu</caption>
        <colgroup>
          <col className="w-20" />
          {days.map((day) => (
            <col key={day} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-neutral-200 pb-2.5 pl-1 text-xs font-medium text-neutral-400 dark:border-neutral-800 dark:text-neutral-500"
            >
              Saat
            </th>
            {days.map((day) => (
              <th
                key={day}
                scope="col"
                aria-current={day === today ? 'date' : undefined}
                className={cn(
                  'px-2 pb-2.5 text-sm font-semibold',
                  day === today
                    ? 'border-b-2 border-accent-500 text-brand-900 dark:text-white'
                    : 'border-b border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300',
                )}
              >
                {DAY_NAMES[day]}
                {day === today ? (
                  <span className="ml-1.5 text-xs font-medium text-accent-600 dark:text-accent-300">
                    bugün
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={`${slot.start}-${slot.end}`}>
              <th
                scope="row"
                className="border-b border-neutral-100 py-2 pr-3 pl-1 align-top font-normal dark:border-neutral-800"
              >
                <span className="block font-display text-sm font-semibold text-neutral-900 tabular-nums dark:text-white">
                  {slot.start}
                </span>
                <span className="block text-xs text-neutral-400 tabular-nums dark:text-neutral-500">
                  {slot.end}
                </span>
              </th>
              {days.map((day) => {
                const items = sorted.filter(
                  (l) => l.dayOfWeek === day && slotKey(l) === `${slot.start}-${slot.end}`,
                );
                return (
                  <td
                    key={day}
                    className={cn(
                      'h-14 border-b border-l border-neutral-100 p-1 align-top dark:border-neutral-800',
                      day === today && 'bg-accent-50/60 dark:bg-accent-500/[0.05]',
                    )}
                  >
                    {items.length ? (
                      <div className="flex flex-col gap-1">{items.map(block)}</div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-5 md:hidden">
        {days
          .filter((day) => sorted.some((l) => l.dayOfWeek === day))
          .map((day) => (
            <section key={day} aria-label={DAY_NAMES[day]}>
              <h4
                className={cn(
                  'mb-2 text-sm font-semibold',
                  day === today
                    ? 'text-brand-900 dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-300',
                )}
              >
                {DAY_NAMES[day]}
                {day === today ? (
                  <span className="ml-1.5 text-xs font-medium text-accent-600 dark:text-accent-300">
                    bugün
                  </span>
                ) : null}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {sorted
                  .filter((l) => l.dayOfWeek === day)
                  .map((l) => (
                    <li key={l.id} className="grid grid-cols-[3rem_1fr] items-start gap-3">
                      <span className="pt-1.5 text-right tabular-nums">
                        <span className="block font-display text-sm font-semibold text-neutral-900 dark:text-white">
                          {l.startTime}
                        </span>
                        <span className="block text-xs text-neutral-400 dark:text-neutral-500">
                          {l.endTime}
                        </span>
                      </span>
                      {block(l)}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}

const TONES = [
  'border-brand-600 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-brand-900/70 dark:text-brand-50',
  'border-accent-500 bg-accent-50 text-accent-800 dark:border-accent-400 dark:bg-accent-500/15 dark:text-accent-100',
  'border-neutral-400 bg-neutral-100 text-neutral-800 dark:border-neutral-400 dark:bg-white/[0.06] dark:text-neutral-100',
];

function LessonBlock({
  name,
  detail,
  hint,
  tone,
  live,
}: {
  name: string;
  detail: string | null;
  hint: string;
  tone: string;
  live: boolean;
}) {
  return (
    <div
      title={hint}
      className={cn(
        '@container rounded-md border-l-[3px] px-2 py-1.5',
        tone,
        live &&
          'ring-2 ring-accent-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900',
      )}
    >
      <p className="line-clamp-2 text-[13px] leading-snug font-semibold">
        {name}
        {live ? <span className="sr-only"> (şu an devam ediyor)</span> : null}
      </p>
      {detail ? <p className="hidden truncate text-xs opacity-80 @[7rem]:block">{detail}</p> : null}
    </div>
  );
}

function slotKey(l: TimetableLesson) {
  return `${l.startTime}-${l.endTime}`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

// "Bugun" ve "su an" vurgusu icin dakikalik saat; sunucuda null (hydration uyumsuzlugu olmasin).
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
}

function useMinute(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}
