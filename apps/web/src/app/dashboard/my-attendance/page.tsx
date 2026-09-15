import type { Metadata } from 'next';
import { MyAttendance } from '@/components/portal/my-attendance';

export const metadata: Metadata = { title: 'Yoklamam · Öğrenci Takip Sistemi' };

export default function MyAttendancePage() {
  return <MyAttendance />;
}
