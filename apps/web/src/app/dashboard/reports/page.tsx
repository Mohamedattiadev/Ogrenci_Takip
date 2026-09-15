import type { Metadata } from 'next';
import { ReportsPanel } from '@/components/dashboard/reports-panel';

export const metadata: Metadata = { title: 'Raporlar · Öğrenci Takip Sistemi' };

export default function ReportsPage() {
  return <ReportsPanel />;
}
