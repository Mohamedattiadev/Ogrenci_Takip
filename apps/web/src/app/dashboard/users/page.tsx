import type { Metadata } from 'next';
import { UserCog } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Kullanıcılar · Öğrenci Takip Sistemi' };

export default function UsersPage() {
  return (
    <ComingSoon
      icon={UserCog}
      title="Kullanıcı Yönetimi"
      description="Kullanıcı ekleme ve rol yetkilendirme burada olacak (sadece sistem/kurum yöneticisi)."
    />
  );
}
