import type { Metadata } from 'next';
import { FileBarChart } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Raporlar · Öğrenci Takip Sistemi' };

export default function ReportsPage() {
  return (
    <ComingSoon
      icon={FileBarChart}
      title="Raporlar"
      description="Devamsızlık raporları ile PDF/Excel/CSV dışa aktarım burada olacak."
    />
  );
}
