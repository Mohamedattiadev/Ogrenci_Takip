import type { Metadata } from 'next';
import { HomeSwitch } from '@/components/dashboard/home-switch';

export const metadata: Metadata = { title: 'Genel Bakış · Öğrenci Takip Sistemi' };

export default function DashboardHomePage() {
  return <HomeSwitch />;
}
