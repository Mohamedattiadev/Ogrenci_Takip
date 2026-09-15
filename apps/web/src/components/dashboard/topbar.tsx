'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  User as UserIcon,
  UserRound,
} from 'lucide-react';
import { logout } from '@/lib/api';
import { navItemForPath } from '@/lib/nav';
import { ROLE_LABELS, useSessionUser } from '@/lib/session';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSidebar } from '@/components/dashboard/sidebar-context';
import { cn } from '@/lib/utils';

const MENU_ITEM = cn(
  'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-neutral-700',
  'hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5',
);

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
  const { openMobile } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    await logout(); // yenileme jetonu sunucuda da iptal edilir
    router.push('/login');
  }

  function go(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openMobile}
          aria-label="Menüyü aç"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 md:hidden dark:text-neutral-400 dark:hover:bg-white/5"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        <h1 className="truncate font-display text-lg font-bold text-brand-900 dark:text-white">
          {navItemForPath(pathname)?.label ?? 'Öğrenci Takip Sistemi'}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5"
          aria-label="Bildirimler"
        >
          <Bell size={18} strokeWidth={1.75} />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              <UserIcon size={15} strokeWidth={2} />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[10rem] truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {user?.fullName ?? (user ? ROLE_LABELS[user.role] : 'Kullanıcı')}
              </span>
              {user?.fullName ? (
                <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                  {ROLE_LABELS[user.role]}
                </span>
              ) : null}
            </span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {user?.role === 'STUDENT' ? (
                <button
                  type="button"
                  onClick={() => go('/dashboard/profile')}
                  className={MENU_ITEM}
                >
                  <UserRound size={15} strokeWidth={1.75} />
                  Profilim
                </button>
              ) : null}
              <button type="button" onClick={() => go('/change-password')} className={MENU_ITEM}>
                <KeyRound size={15} strokeWidth={1.75} />
                Şifre Değiştir
              </button>
              <button type="button" onClick={handleLogout} className={MENU_ITEM}>
                <LogOut size={15} strokeWidth={1.75} />
                Çıkış Yap
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
