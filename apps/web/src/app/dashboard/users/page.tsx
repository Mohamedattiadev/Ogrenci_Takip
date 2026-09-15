import type { Metadata } from 'next';
import { UsersTable } from '@/components/dashboard/users-table';

export const metadata: Metadata = { title: 'Kullanıcılar · Öğrenci Takip Sistemi' };

export default function UsersPage() {
  return <UsersTable />;
}
