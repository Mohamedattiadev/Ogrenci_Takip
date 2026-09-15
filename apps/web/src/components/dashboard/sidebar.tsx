'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TdvMark } from '@/components/brand/tdv-mark';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-900 md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <TdvMark className="h-8 w-8 text-white" />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm font-bold text-white">Öğrenci Takip</span>
          <span className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
            Türkiye Diyanet Vakfı
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-700 text-white shadow-inner shadow-black/10'
                  : 'text-white/55 hover:bg-white/5 hover:text-white/90',
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-[11px] leading-relaxed text-white/35">
          Öğrenci Takip Sistemi
          <br />
          Sürüm 0.1 (v1 geliştirme)
        </p>
      </div>
    </aside>
  );
}
