import type { Metadata } from 'next';
import { MySchedule } from '@/components/portal/my-schedule';

export const metadata: Metadata = { title: 'Derslerim · Öğrenci Takip Sistemi' };

export default function MySchedulePage() {
  return <MySchedule />;
}
