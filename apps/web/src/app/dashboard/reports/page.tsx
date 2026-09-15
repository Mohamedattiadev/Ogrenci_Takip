import type { Metadata } from 'next';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarX,
  GraduationCap,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { ReportCard } from '@/components/dashboard/report-card';

export const metadata: Metadata = { title: 'Raporlar · Öğrenci Takip Sistemi' };

const REPORTS = [
  {
    icon: UserRoundX,
    title: 'Öğrenci Bazlı Devamsızlık',
    description: 'Her öğrencinin durum sayaçları ve devam yüzdesi.',
  },
  {
    icon: UsersRound,
    title: 'Grup ve Sınıf Bazlı Yoklama',
    description: 'Grup/sınıf düzeyinde toplu yoklama özeti.',
  },
  {
    icon: BookOpen,
    title: 'Ders Bazlı Yoklama',
    description: 'Bir dersin tüm oturumlarındaki devam durumu.',
  },
  {
    icon: GraduationCap,
    title: 'Öğretmen Bazlı Ders ve Yoklama',
    description: 'Öğretmenin verdiği dersler ve yoklama girişleri.',
  },
  {
    icon: AlertTriangle,
    title: 'En Fazla Devamsızlık Yapan Öğrenciler',
    description: 'Habersiz/haberli devamsızlığa göre sıralanmış liste.',
  },
  {
    icon: CalendarX,
    title: 'Yoklaması Girilmeyen Dersler',
    description: 'Geçmiş oturumlardan yoklaması hiç girilmemiş olanlar.',
  },
  {
    icon: BarChart3,
    title: 'Öğretmenlerin Yoklama Giriş Durumu',
    description: 'Öğretmen başına yoklama girme oranı.',
  },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          Raporlar
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Bir rapor seçip PDF, Excel veya CSV olarak dışa aktarın.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <ReportCard key={report.title} {...report} />
        ))}
      </div>
    </div>
  );
}
