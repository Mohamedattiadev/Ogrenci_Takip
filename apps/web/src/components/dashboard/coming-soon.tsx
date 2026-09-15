import type { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** v1'de sidebar tam gezilebilir olsun diye - henuz yapilmamis ekranlar icin durust bir yer tutucu. */
export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white/60 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-lg font-bold text-neutral-800">{title}</h2>
      {/* w-full sart: flex column + items-center'da max-w tek basina yetmiyor,
          tarayici genisligi min-content'e (en uzun kelimeye) daraltip her
          kelimeyi ayri satira dokebiliyor. */}
      <p className="w-full max-w-sm text-sm text-neutral-500">{description}</p>
      <span className="mt-1 rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-500 uppercase">
        Yapım aşamasında
      </span>
    </div>
  );
}
