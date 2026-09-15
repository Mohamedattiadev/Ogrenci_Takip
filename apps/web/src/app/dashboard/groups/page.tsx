import type { Metadata } from 'next';
import { GroupsTable } from '@/components/dashboard/groups-table';

export const metadata: Metadata = { title: 'Gruplar · Öğrenci Takip Sistemi' };

export default function GroupsPage() {
  return <GroupsTable />;
}
