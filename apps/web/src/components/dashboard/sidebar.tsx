'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { TdvMark } from '@/components/brand/tdv-mark';
import { NAV_ITEMS } from '@/lib/nav';
import { useSidebar } from './sidebar-context';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-brand-900 transition-[width] duration-200 md:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <div className={cn('flex items-center gap-3 px-5 py-6', collapsed && 'justify-center px-0')}>
        <TdvMark className="h-8 w-8 shrink-0 text-mark-500" />
        {collapsed ? null : (
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold text-white">Öğrenci Takip</span>
              <span className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
                Türkiye Diyanet Vakfı
              </span>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50">
              v0.1
            </span>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium',
                'outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-white text-brand-900 shadow-sm'
                  : 'text-white/60 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              <Icon
                size={18}
                strokeWidth={1.75}
                className={cn(
                  'shrink-0',
                  active ? 'text-mark-500' : 'text-white/40 group-hover:text-white/70',
                )}
              />
              {collapsed ? null : item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
        title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        className={cn(
          'mx-3 mb-3 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-white/45',
          'outline-none transition-colors hover:bg-white/5 hover:text-white/80',
          'focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <ChevronsRight size={18} strokeWidth={1.75} />
        ) : (
          <ChevronsLeft size={18} strokeWidth={1.75} />
        )}
        {collapsed ? null : 'Menüyü Daralt'}
      </button>

      {collapsed ? null : (
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-[11px] leading-relaxed text-white/35">
            Öğrenci Takip Sistemi
            <br />
            Sürüm 0.1 (v1 geliştirme)
          </p>
        </div>
      )}
    </aside>
  );
}
