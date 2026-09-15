import type { Metadata } from 'next';
import { StudentsTable } from '@/components/dashboard/students-table';

export const metadata: Metadata = { title: 'Öğrenciler · Öğrenci Takip Sistemi' };

export default function StudentsPage() {
  return <StudentsTable />;
}
