'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, LifeBuoy, X } from 'lucide-react';
import { TdvMark } from '@/components/brand/tdv-mark';
import { NAV_ITEMS, groupNavBySection } from '@/lib/nav';
import { useSidebar } from './sidebar-context';
import { cn } from '@/lib/utils';

const NAV_GROUPS = groupNavBySection(NAV_ITEMS);

interface SidebarBodyProps {
  collapsed: boolean;
  onNavigate?: () => void;
  headerRight?: React.ReactNode;
  onToggleCollapse?: () => void;
}

/**
 * Masaustu daraltilabilir aside VE mobil acilir menu ayni icerigi (logo,
 * gruplu nav, alt kisim) paylasir - tekrar yazmak yerine ortak govde.
 */
function SidebarBody({ collapsed, onNavigate, headerRight, onToggleCollapse }: SidebarBodyProps) {
  const pathname = usePathname();

  return (
    <>
      <div className={cn('flex items-center gap-3 px-5 py-4', collapsed && 'justify-center px-0')}>
        <TdvMark className="h-8 w-8 shrink-0 text-mark-500" />
        {collapsed ? null : (
          <div className="flex flex-1 items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold text-white">Öğrenci Takip</span>
              <span className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
                Türkiye Diyanet Vakfı
              </span>
            </div>
            {headerRight ?? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                v0.1
              </span>
            )}
          </div>
        )}
      </div>

      <nav className="sidebar-nav-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-1.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="flex flex-col gap-0.5">
            {collapsed ? (
              <div className="mx-auto my-1 h-px w-6 bg-white/10" />
            ) : (
              <span className="px-3.5 pb-1 text-[10px] font-semibold tracking-[0.12em] text-white/30 uppercase">
                {group.section}
              </span>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium',
                    'outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'bg-white text-brand-900 shadow-sm'
                      : 'text-white/60 hover:bg-white/[0.08] hover:text-white',
                  )}
                >
                  <Icon
                    size={17}
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
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          disabled
          title={collapsed ? 'Yardım & Destek (yakında)' : undefined}
          className={cn(
            'flex cursor-not-allowed items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-white/30 outline-none',
            collapsed && 'justify-center px-0',
          )}
        >
          <LifeBuoy size={17} strokeWidth={1.75} className="shrink-0" />
          {collapsed ? null : (
            <span className="flex flex-1 items-center justify-between">
              Yardım & Destek
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/40">
                Yakında
              </span>
            </span>
          )}
        </button>

        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3.5 py-2 text-sm font-medium text-white/45',
              'outline-none transition-colors hover:bg-white/5 hover:text-white/80',
              'focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <ChevronsRight size={17} strokeWidth={1.75} />
            ) : (
              <ChevronsLeft size={17} strokeWidth={1.75} />
            )}
            {collapsed ? null : 'Menüyü Daralt'}
          </button>
        ) : null}
      </div>
    </>
  );
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-brand-900 transition-[width] duration-200 md:flex dark:bg-brand-950',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <SidebarBody collapsed={collapsed} onToggleCollapse={toggle} />
    </aside>
  );
}

/**
 * Mobilde (md altı) Sidebar tamamen "hidden" oldugu icin nav'a erismenin
 * hicbir yolu yoktu - sadece URL'yi elle yazmak disinda. Bu, TopBar'daki
 * hamburger butonuyla acilan bir kaydirmali (overlay + panel) menu.
 */
export function MobileSidebar() {
  const { mobileOpen, closeMobile } = useSidebar();

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 md:hidden',
        mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!mobileOpen}
    >
      <div
        onClick={closeMobile}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          mobileOpen ? 'opacity-100' : 'opacity-0',
        )}
      />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-900 shadow-2xl transition-transform duration-200 dark:bg-brand-950',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarBody
          collapsed={false}
          onNavigate={closeMobile}
          headerRight={
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Menüyü kapat"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X size={16} strokeWidth={2} />
            </button>
          }
        />
      </aside>
    </div>
  );
}
