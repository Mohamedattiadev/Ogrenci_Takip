import type { Metadata } from 'next';
import { DashboardHome } from '@/components/dashboard/dashboard-home';

export const metadata: Metadata = { title: 'Genel Bakış · Öğrenci Takip Sistemi' };

export default function DashboardHomePage() {
  return <DashboardHome />;
}
