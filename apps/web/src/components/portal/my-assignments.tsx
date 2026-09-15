'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { FileText, PenLine } from 'lucide-react';
import { useLiveEvents } from '@/lib/live';
import type { HomeworkStatus, PortalAssignmentSummary } from '@/lib/portal-types';
import { formatDateTime } from '@/lib/portal-types';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import { Badge, Card, Empty, ErrorNote, HOMEWORK_LABEL, Loading, PageHeader } from './ui';

const FILTERS: { key: 'ALL' | HomeworkStatus; label: string }[] = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'PENDING', label: 'Bekleyen' },
  { key: 'SUBMITTED', label: 'Teslim edilen' },
  { key: 'MISSED', label: 'Süresi geçen' },
];

export function MyAssignments() {
  const { data, error, reload } = useApi<PortalAssignmentSummary[]>('portal/assignments');
  const [filter, setFilter] = useState<'ALL' | HomeworkStatus>('ALL');

  // Hoca yeni odev verdiginde veya odevi guncellediginde liste kendiliginden yenilenir.
  useLiveEvents(
    useCallback(
      (event) => {
        if (event.type.startsWith('assignment.')) reload();
      },
      [reload],
    ),
  );

  const rows = (data ?? []).filter((a) => filter === 'ALL' || a.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ödevlerim"
        description="Hocalarınızın verdiği ödevler ve teslim durumunuz"
      />
      <ErrorNote message={error} />
      <Card>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium',
                filter === f.key
                  ? 'bg-brand-700 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Bu listede ödev yok.</Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dashboard/my-assignments/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">{a.title}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {a.course.name} · {a.teacher?.name ?? '—'} ·{' '}
                      {a.dueAt ? `Son teslim ${formatDateTime(a.dueAt)}` : 'Süresiz'}
                    </p>
                    <p className="mt-1 flex gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                      {a.allowText ? (
                        <span className="inline-flex items-center gap-1">
                          <PenLine size={12} /> Metin
                        </span>
                      ) : null}
                      {a.allowFile ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText size={12} /> PDF
                        </span>
                      ) : null}
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
  );
}
