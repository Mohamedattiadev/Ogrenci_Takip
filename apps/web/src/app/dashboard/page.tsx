import type { Metadata } from 'next';
import { BookOpen, CalendarClock, ClipboardCheck, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatStrip, type StatItem } from '@/components/dashboard/stat-strip';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Genel Bakış · Öğrenci Takip Sistemi' };

const STATS: StatItem[] = [
  { label: 'Toplam Öğrenci', value: '428', tone: 'brand' },
  { label: 'Aktif Öğretmen', value: '16', tone: 'accent' },
  { label: 'Aktif Grup', value: '24', tone: 'success' },
  { label: 'Bugünkü Ders', value: '6', tone: 'warning' },
];

const SAMPLE_LESSONS = [
  { group: 'A Grubu', course: 'Matematik', teacher: 'Ahmet Yılmaz', time: '18:00' },
  { group: 'B Grubu', course: 'Fizik', teacher: 'Ayşe Kaya', time: '19:00' },
  { group: 'A Grubu', course: 'Geometri', teacher: 'Ahmet Yılmaz', time: '20:00' },
];

const ACTIVITY_TONES: Record<string, { icon: LucideIcon; className: string }> = {
  attendance: {
    icon: ClipboardCheck,
    className: 'bg-status-presentBg text-status-present dark:bg-status-present/15',
  },
  student: {
    icon: UserPlus,
    className: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  },
  schedule: {
    icon: CalendarClock,
    className: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
  },
};

const SAMPLE_ACTIVITY = [
  { type: 'attendance', text: 'Ahmet Yılmaz, A Grubu için yoklama aldı.', time: '2 saat önce' },
  { type: 'student', text: 'Yeni öğrenci eklendi: Cemre Aydın.', time: 'Dün' },
  { type: 'schedule', text: 'B Grubu ders programı güncellendi.', time: '2 gün önce' },
] as const;

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          Hoş geldiniz
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Sistemin genel durumuna hızlı bir bakış.
        </p>
      </div>

      <StatStrip items={STATS} sample />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
              Bugünkü Dersler
            </h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 uppercase dark:bg-white/5 dark:text-neutral-500">
              Örnek veri
            </span>
          </div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                    Ders
                  </th>
                  <th className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                    Grup
                  </th>
                  <th className="px-1 pb-2.5 text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                    Öğretmen
                  </th>
                  <th className="px-1 pb-2.5 text-right text-xs font-semibold tracking-wide text-neutral-400 uppercase dark:text-neutral-500">
                    Saat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {SAMPLE_LESSONS.map((lesson) => (
                  <tr
                    key={`${lesson.group}-${lesson.time}`}
                    className="hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-1 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                          <BookOpen size={14} strokeWidth={1.75} />
                        </span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-100">
                          {lesson.course}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-3 text-neutral-600 dark:text-neutral-300">
                      {lesson.group}
                    </td>
                    <td className="px-1 py-3 text-neutral-600 dark:text-neutral-300">
                      {lesson.teacher}
                    </td>
                    <td className="px-1 py-3 text-right text-neutral-600 [font-variant-numeric:tabular-nums] dark:text-neutral-300">
                      {lesson.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white">
              Son Aktiviteler
            </h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 uppercase dark:bg-white/5 dark:text-neutral-500">
              Örnek
            </span>
          </div>
          <ul className="-mx-1 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {SAMPLE_ACTIVITY.map((activity) => {
              const tone = ACTIVITY_TONES[activity.type]!;
              const Icon = tone.icon;
              return (
                <li key={activity.text} className="flex items-start gap-3 px-1 py-3">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      tone.className,
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {activity.text}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {activity.time}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
