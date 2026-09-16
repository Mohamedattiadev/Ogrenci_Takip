import type { Metadata } from 'next';
import { SessionAttendanceForm } from '@/components/dashboard/session-attendance-form';

export const metadata: Metadata = { title: 'Yoklama Al · Öğrenci Takip Sistemi' };

export default function SessionAttendancePage() {
  return <SessionAttendanceForm />;
}
