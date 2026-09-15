'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarX,
  Clock,
  GraduationCap,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { ReportCard, type ReportFormat } from '@/components/dashboard/report-card';
import { ApiError, downloadFile } from '@/lib/api';

const REPORTS = [
  {
    slug: 'student-attendance',
    icon: UserRoundX,
    title: 'Öğrenci Bazlı Devamsızlık',
    description: 'Her öğrencinin durum sayaçları ve devam yüzdesi.',
  },
  {
    slug: 'group-attendance',
    icon: UsersRound,
    title: 'Grup Bazlı Yoklama',
    description: 'Grup düzeyinde toplu yoklama özeti.',
  },
  {
    slug: 'course-attendance',
    icon: BookOpen,
    title: 'Ders Bazlı Yoklama',
    description: 'Bir dersin tüm oturumlarındaki devam durumu.',
  },
  {
    slug: 'teacher-attendance',
    icon: GraduationCap,
    title: 'Öğretmen Bazlı Ders ve Yoklama',
    description: 'Planlanan, iptal edilen dersler ve yoklama giriş oranı.',
  },
  {
    slug: 'top-absentees',
    icon: AlertTriangle,
    title: 'En Fazla Devamsızlık Yapan Öğrenciler',
    description: 'Habersiz/haberli devamsızlığa göre sıralanmış liste.',
  },
  {
    slug: 'missing-attendance',
    icon: CalendarX,
    title: 'Yoklaması Girilmeyen Dersler',
    description: 'Gerçekleşmesi gereken ama yoklaması girilmemiş dersler.',
  },
  {
    slug: 'excused-and-late',
    icon: Clock,
    title: 'İzinli ve Geç Kalan Öğrenciler',
    description: 'İzinli, haberli devamsız ve geç gelen kayıtları.',
  },
  {
    slug: 'attendance-trend',
    icon: BarChart3,
    title: 'Haftalık Devam Trendi',
    description: 'Haftalara göre devam yüzdesi.',
  },
] as const;

function isoDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function ReportsPanel() {
  const today = new Date();
  const [from, setFrom] = useState(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(today));
  const [busy, setBusy] = useState<{ slug: string; format: ReportFormat } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(slug: string, format: ReportFormat) {
    setError(null);
    setBusy({ slug, format });
    try {
      await downloadFile(`reports/${slug}`, { from, to, format });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rapor indirilemedi.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-neutral-900">Raporlar</h2>
          <p className="text-sm text-neutral-500">
            Tarih aralığı seçip PDF, Excel veya CSV olarak dışa aktarın (aylık, dönemlik, yıllık).
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Başlangıç
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Bitiş
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </label>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger"
        >
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map(({ slug, ...report }) => (
          <ReportCard
            key={slug}
            {...report}
            busyFormat={busy?.slug === slug ? busy.format : null}
            onDownload={(format) => void download(slug, format)}
          />
        ))}
      </div>
    </div>
  );
}
