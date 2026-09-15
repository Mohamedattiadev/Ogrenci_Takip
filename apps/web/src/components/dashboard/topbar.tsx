'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Search, User as UserIcon } from 'lucide-react';
import { logout } from '@/lib/api';
import { NAV_ITEMS } from '@/lib/nav';
import { ROLE_LABELS, useSessionUser } from '@/lib/session';
import { cn } from '@/lib/utils';

function pageTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) => item.href === pathname);
  return match?.label ?? 'Öğrenci Takip Sistemi';
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSessionUser();
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

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <h1 className="font-display text-lg font-bold text-brand-900">{pageTitle(pathname)}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            placeholder="Öğrenci veya grup ara…"
            className="h-9 w-56 rounded-lg border border-neutral-200 bg-neutral-50 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          aria-label="Bildirimler"
        >
          <Bell size={18} strokeWidth={1.75} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-mark-500" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-neutral-100"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <UserIcon size={15} strokeWidth={2} />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold text-neutral-800">
                {user ? ROLE_LABELS[user.role] : 'Kullanıcı'}
              </span>
            </span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  'flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-neutral-700',
                  'hover:bg-neutral-50',
                )}
              >
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
