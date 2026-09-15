import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Öğrenciler · Öğrenci Takip Sistemi' };

export default function StudentsPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Öğrenci Yönetimi"
      description="Öğrenci ekleme, düzenleme, silme ve Excel'den toplu aktarım burada olacak."
    />
  );
}
