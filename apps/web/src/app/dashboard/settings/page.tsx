import type { Metadata } from 'next';
import { Settings } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Ayarlar · Öğrenci Takip Sistemi' };

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Ayarlar"
      description="Yedekleme, veri dışa aktarma ve kurum bilgileri burada olacak."
    />
  );
}
