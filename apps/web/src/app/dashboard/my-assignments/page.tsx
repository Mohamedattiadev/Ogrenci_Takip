import type { Metadata } from 'next';
import { MyAssignments } from '@/components/portal/my-assignments';

export const metadata: Metadata = { title: 'Ödevlerim · Öğrenci Takip Sistemi' };

export default function MyAssignmentsPage() {
  return <MyAssignments />;
}
