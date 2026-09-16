import type { ReactNode } from 'react';
import type { AttendanceStatus } from '@/lib/types';
import type { HomeworkStatus } from '@/lib/portal-types';
import { cn } from '@/lib/utils';

/** Ogrenci ve odev ekranlarinin ortak gorsel parcalari (acik/koyu tema). */

export const CARD =
  'rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(CARD, 'flex flex-col gap-4', className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
    >
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">{children}</p>
  );
}

export function Loading() {
  return <Empty>Yükleniyor…</Empty>;
}

const TONES = {
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400',
  success: 'bg-status-presentBg text-status-present dark:bg-status-present/15',
  warning: 'bg-status-lateBg text-status-late dark:bg-status-late/15',
  danger:
    'bg-status-absentUnexcusedBg text-status-absentUnexcused dark:bg-status-absentUnexcused/15',
  info: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: 'success',
  LATE: 'warning',
  EXCUSED: 'info',
  ABSENT: 'danger',
  ABSENT_EXCUSED: 'accent',
};

export const HOMEWORK_LABEL: Record<HomeworkStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Bekliyor', tone: 'warning' },
  SUBMITTED: { label: 'Teslim edildi', tone: 'success' },
  MISSED: { label: 'Süresi geçti', tone: 'danger' },
};

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-800">
            {head.map((label) => (
              <th
                key={label}
                className="px-2 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 text-neutral-600 dark:divide-neutral-800 dark:text-neutral-300">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-2 py-2.5 align-top', className)}>{children}</td>;
}

export function rateText(rate: number | null | undefined) {
  return rate === null || rate === undefined ? '—' : `%${rate}`;
}
