import type { LucideIcon } from 'lucide-react';

interface ReportCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FORMATS = ['PDF', 'Excel', 'CSV'];

export function ReportCard({ icon: Icon, title, description }: ReportCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
          >
            {format}
          </button>
        ))}
      </div>
    </div>
  );
}
