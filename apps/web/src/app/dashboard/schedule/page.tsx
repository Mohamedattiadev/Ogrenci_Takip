import type { Metadata } from 'next';
import { CalendarRange } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Ders Programı · Öğrenci Takip Sistemi' };

export default function SchedulePage() {
  return (
    <ComingSoon
      icon={CalendarRange}
      title="Ders Programı"
      description="Haftalık ders programı oluşturma, tatil takvimi ve iptal/telafi yönetimi burada olacak."
    />
  );
}
