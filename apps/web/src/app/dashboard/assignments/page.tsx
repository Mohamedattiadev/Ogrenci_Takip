import type { Metadata } from 'next';
import { AssignmentsTable } from '@/components/homework/assignments-table';

export const metadata: Metadata = { title: 'Ödevler · Öğrenci Takip Sistemi' };

export default function AssignmentsPage() {
  return <AssignmentsTable />;
}
