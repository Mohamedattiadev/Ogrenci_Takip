'use client';

import { DashboardHome } from '@/components/dashboard/dashboard-home';
import { StudentHome } from '@/components/portal/student-home';
import { useSessionUser } from '@/lib/session';

/** Genel Bakis: ogrenci kendi panelini, personel yurt ozetini gorur. */
export function HomeSwitch() {
  const user = useSessionUser();
  if (!user) return null;
  return user.role === 'STUDENT' ? <StudentHome /> : <DashboardHome />;
}
