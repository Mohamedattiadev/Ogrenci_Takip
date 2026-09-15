'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasSession } from '@/lib/api';

/**
 * Oturum yoksa giris sayfasina yonlendirir. Asil yetki kontrolu API'dedir
 * (JWT + RLS); bu sadece bos panel gostermemek icin istemci tarafi kontrol.
 */
export function AuthGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!hasSession()) router.replace('/login');
  }, [router]);
  return null;
}
