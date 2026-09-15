import type { Metadata } from 'next';
import { UsersRound } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Gruplar · Öğrenci Takip Sistemi' };

export default function GroupsPage() {
  return (
    <ComingSoon
      icon={UsersRound}
      title="Grup Yönetimi"
      description="Grup/sınıf oluşturma, öğrenci atama ve grup değişiklik geçmişi burada olacak."
    />
  );
}
