import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sample?: boolean;
}

export function StatTile({ icon: Icon, label, value, sample }: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        {sample ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase">
            Örnek
          </span>
        ) : null}
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-neutral-900 [font-variant-numeric:tabular-nums]">
          {value}
        </p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  );
}
