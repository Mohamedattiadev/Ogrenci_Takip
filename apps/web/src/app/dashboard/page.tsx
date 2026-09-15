import type { Metadata } from 'next';
import { Users, GraduationCap, UsersRound, CalendarRange } from 'lucide-react';
import { StatTile } from '@/components/dashboard/stat-tile';

export const metadata: Metadata = { title: 'Genel Bakış · Öğrenci Takip Sistemi' };

const SAMPLE_LESSONS = [
  { group: 'A Grubu', course: 'Matematik', teacher: 'Ahmet Yılmaz', time: '18:00' },
  { group: 'B Grubu', course: 'Fizik', teacher: 'Ayşe Kaya', time: '19:00' },
  { group: 'A Grubu', course: 'Geometri', teacher: 'Ahmet Yılmaz', time: '20:00' },
];

const SAMPLE_ACTIVITY = [
  { text: 'Ahmet Yılmaz, A Grubu için yoklama aldı.', time: '2 saat önce' },
  { text: 'Yeni öğrenci eklendi: Cemre Aydın.', time: 'Dün' },
  { text: 'B Grubu ders programı güncellendi.', time: '2 gün önce' },
];

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900">Hoş geldiniz</h2>
        <p className="text-sm text-neutral-500">Sistemin genel durumuna hızlı bir bakış.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Users} label="Toplam Öğrenci" value="428" sample />
        <StatTile icon={GraduationCap} label="Aktif Öğretmen" value="16" sample />
        <StatTile icon={UsersRound} label="Aktif Grup" value="24" sample />
        <StatTile icon={CalendarRange} label="Bugünkü Ders" value="6" sample />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900">Bugünkü Dersler</h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 uppercase">
              Örnek veri
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-neutral-400 uppercase">
                  <th className="pb-2 font-medium">Grup</th>
                  <th className="pb-2 font-medium">Ders</th>
                  <th className="pb-2 font-medium">Öğretmen</th>
                  <th className="pb-2 font-medium">Saat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {SAMPLE_LESSONS.map((lesson) => (
                  <tr key={`${lesson.group}-${lesson.time}`}>
                    <td className="py-2.5 font-medium text-neutral-800">{lesson.group}</td>
                    <td className="py-2.5 text-neutral-600">{lesson.course}</td>
                    <td className="py-2.5 text-neutral-600">{lesson.teacher}</td>
                    <td className="py-2.5 text-neutral-600 [font-variant-numeric:tabular-nums]">
                      {lesson.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-neutral-900">Son Aktiviteler</h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500 uppercase">
              Örnek
            </span>
          </div>
          <ul className="flex flex-col gap-3.5">
            {SAMPLE_ACTIVITY.map((activity) => (
              <li key={activity.text} className="flex flex-col gap-0.5 text-sm">
                <span className="text-neutral-700">{activity.text}</span>
                <span className="text-xs text-neutral-400">{activity.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
