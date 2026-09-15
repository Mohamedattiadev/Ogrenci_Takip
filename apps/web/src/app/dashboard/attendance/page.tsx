import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';
import { ComingSoon } from '@/components/dashboard/coming-soon';

export const metadata: Metadata = { title: 'Yoklama · Öğrenci Takip Sistemi' };

export default function AttendancePage() {
  return (
    <ComingSoon
      icon={ClipboardCheck}
      title="Yoklama Görüntüleme"
      description="Yoklama kayıtlarını görüntüleme, filtreleme ve düzeltme burada olacak."
    />
  );
}
