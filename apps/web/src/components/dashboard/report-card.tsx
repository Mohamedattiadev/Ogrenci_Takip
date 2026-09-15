import type { LucideIcon } from 'lucide-react';

export type ReportFormat = 'pdf' | 'excel' | 'csv';

interface ReportCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  busyFormat?: ReportFormat | null;
  onDownload?: (format: ReportFormat) => void;
}

const FORMATS: { label: string; value: ReportFormat }[] = [
  { label: 'PDF', value: 'pdf' },
  { label: 'Excel', value: 'excel' },
  { label: 'CSV', value: 'csv' },
];

export function ReportCard({
  icon: Icon,
  title,
  description,
  busyFormat,
  onDownload,
}: ReportCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-neutral-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {FORMATS.map((format) => (
          <button
            key={format.value}
            type="button"
            disabled={!onDownload || Boolean(busyFormat)}
            onClick={() => onDownload?.(format.value)}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyFormat === format.value ? 'Hazırlanıyor…' : format.label}
          </button>
        ))}
      </div>
    </div>
  );
}
