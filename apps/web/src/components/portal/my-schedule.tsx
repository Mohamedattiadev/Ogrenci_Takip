'use client';

import type { PortalSchedule } from '@/lib/portal-types';
import { formatDateTr } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { Badge, Card, Empty, ErrorNote, Loading, PageHeader, Table, Td } from './ui';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export function MySchedule() {
  const { data, error } = useApi<PortalSchedule>('portal/schedule');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Derslerim"
        description="Kayıtlı olduğunuz dersler, haftalık ders tablonuz ve hocalarınız"
      />
      <ErrorNote message={error} />

      <Card title="Dersler ve Hocalar">
        {!data ? (
          <Loading />
        ) : data.courses.length === 0 ? (
          <Empty>Henüz bir derse kayıtlı değilsiniz.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.courses.map((c) => (
              <div
                key={c.course.id}
                className="rounded-lg border border-neutral-100 p-4 dark:border-neutral-800"
              >
                <p className="font-medium text-neutral-800 dark:text-neutral-100">
                  {c.course.name}
                </p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Hoca: {c.teachers.length ? c.teachers.join(', ') : '—'}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Grup: {c.groups.join(', ')} · Haftada {c.weeklyLessons} ders
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Haftalık Ders Tablosu">
        {!data ? (
          <Loading />
        ) : data.lessons.length === 0 ? (
          <Empty>Ders tablonuz boş.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DAYS.map((day, index) => {
              const lessons = data.lessons.filter((l) => l.dayOfWeek === index);
              if (lessons.length === 0) return null;
              return (
                <div
                  key={day}
                  className="rounded-lg border border-neutral-100 dark:border-neutral-800"
                >
                  <p className="border-b border-neutral-100 px-3 py-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:border-neutral-800 dark:text-neutral-400">
                    {day}
                  </p>
                  <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                    {lessons.map((l) => (
                      <li key={l.id} className="px-3 py-2.5 text-sm">
                        <p className="font-medium text-neutral-800 [font-variant-numeric:tabular-nums] dark:text-neutral-100">
                          {l.startTime}–{l.endTime} · {l.course.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {l.teacher?.name ?? '—'}
                          {l.classroom ? ` · ${l.classroom}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Önümüzdeki 14 Gün">
        {data?.holidays.length ? (
          <div className="flex flex-wrap gap-2">
            {data.holidays.map((h) => (
              <Badge key={h.date} tone="accent">
                {formatDateTr(h.date)} · {h.description}
              </Badge>
            ))}
          </div>
        ) : null}
        {!data ? (
          <Loading />
        ) : data.upcoming.length === 0 ? (
          <Empty>Önümüzdeki iki haftada planlanmış ders yok.</Empty>
        ) : (
          <Table head={['Tarih', 'Saat', 'Ders', 'Hoca', 'Derslik', 'Durum']}>
            {data.upcoming.map((s) => (
              <tr key={s.id}>
                <Td>
                  {formatDateTr(s.date)} {s.dayName}
                </Td>
                <Td className="[font-variant-numeric:tabular-nums]">
                  {s.startTime}–{s.endTime}
                </Td>
                <Td className="font-medium text-neutral-800 dark:text-neutral-100">
                  {s.course.name}
                </Td>
                <Td>{s.teacher?.name ?? '—'}</Td>
                <Td>{s.classroom ?? '—'}</Td>
                <Td>
                  {s.isCancelled ? (
                    <Badge tone="danger">İptal{s.cancelReason ? `: ${s.cancelReason}` : ''}</Badge>
                  ) : s.isMakeup ? (
                    <Badge tone="info">Telafi</Badge>
                  ) : (
                    <Badge tone="success">Planlı</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
