import type { Metadata } from 'next';
import { ProfilePage } from '@/components/portal/profile-form';

export const metadata: Metadata = { title: 'Profilim · Öğrenci Takip Sistemi' };

export default function StudentProfilePage() {
  return <ProfilePage />;
}
