import type { Metadata } from 'next';
import { SettingsPanel } from '@/components/dashboard/settings-panel';

export const metadata: Metadata = { title: 'Ayarlar · Öğrenci Takip Sistemi' };

export default function SettingsPage() {
  return <SettingsPanel />;
}
