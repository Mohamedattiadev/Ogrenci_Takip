import type { Metadata } from 'next';
import { ScheduleTable } from '@/components/dashboard/schedule-table';

export const metadata: Metadata = { title: 'Ders Programı · Öğrenci Takip Sistemi' };

export default function SchedulePage() {
  return <ScheduleTable />;
}
