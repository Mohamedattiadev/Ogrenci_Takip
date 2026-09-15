'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { hasSession } from '@/lib/api';
import { navItemForPath } from '@/lib/nav';
import { useSessionUser } from '@/lib/session';

/**
 * Istemci tarafi yonlendirmeler (asil yetki kontrolu API'de: JWT + RLS):
 * - oturum yoksa giris sayfasi,
 * - gecici sifreyle girildiyse sifre degistirme sayfasi,
 * - rolun erisemeyecegi bir sayfadaysa genel bakis.
 */
export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSessionUser();

  useEffect(() => {
    if (!hasSession()) {
      router.replace('/login');
      return;
    }
    if (!user) return;
    if (user.mustChangePassword) {
      if (pathname !== '/change-password') router.replace('/change-password');
      return;
    }
    const item = navItemForPath(pathname);
    if (item?.roles && !item.roles.includes(user.role)) router.replace('/dashboard');
  }, [router, pathname, user]);

  return null;
}
