import type { Metadata } from 'next';
import { AssignmentDetail } from '@/components/homework/assignment-detail';

export const metadata: Metadata = { title: 'Ödev · Öğrenci Takip Sistemi' };

export default function AssignmentDetailPage() {
  return <AssignmentDetail />;
}
