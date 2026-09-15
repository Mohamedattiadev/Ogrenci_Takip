import { cn } from '@/lib/utils';

type Tone = 'brand' | 'accent' | 'success' | 'warning';

const TONE_BAR: Record<Tone, string> = {
  brand: 'bg-brand-700',
  accent: 'bg-accent-500',
  success: 'bg-status-present',
  warning: 'bg-status-late',
};

export interface StatItem {
  label: string;
  value: string;
  tone: Tone;
}

/**
 * Dort ayri "ikon rozetli kart" yerine TEK bir serit - jenerik dashboard
 * sablonu hissini kirmak icin bilincli bir tercih. Renk, ikon rozeti yerine
 * her sayinin altindaki ince cizgiyle veriliyor.
 */
export function StatStrip({ items, sample }: { items: StatItem[]; sample?: boolean }) {
  return (
    <div className="relative rounded-xl border border-neutral-200 bg-white">
      {sample ? (
        <span className="absolute top-4 right-5 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-400 uppercase">
          Örnek veri
        </span>
      ) : null}
      <div className="grid grid-cols-2 divide-y divide-neutral-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-2 p-5">
            <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
              {item.label}
            </span>
            <span className="font-display text-3xl font-bold text-neutral-900 [font-variant-numeric:tabular-nums]">
              {item.value}
            </span>
            <span className={cn('h-0.5 w-8 rounded-full', TONE_BAR[item.tone])} />
          </div>
        ))}
      </div>
    </div>
  );
}
