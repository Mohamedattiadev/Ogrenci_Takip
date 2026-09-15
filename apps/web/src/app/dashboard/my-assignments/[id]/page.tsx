import type { Metadata } from 'next';
import { AssignmentAnswer } from '@/components/portal/assignment-answer';

export const metadata: Metadata = { title: 'Ödev · Öğrenci Takip Sistemi' };

export default function MyAssignmentPage() {
  return <AssignmentAnswer />;
}
