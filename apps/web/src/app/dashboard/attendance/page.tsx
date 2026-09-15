import type { Metadata } from 'next';
import { AttendanceTable } from '@/components/dashboard/attendance-table';

export const metadata: Metadata = { title: 'Yoklama · Öğrenci Takip Sistemi' };

export default function AttendancePage() {
  return <AttendanceTable />;
}
