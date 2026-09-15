'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleRow {
  group: string;
  course: string;
  teacher: string;
  day: string;
  time: string;
  classroom: string;
}

const SAMPLE_ROWS: ScheduleRow[] = [
  {
    group: 'A Grubu',
    course: 'Matematik',
    teacher: 'Ahmet Yılmaz',
    day: 'Salı',
    time: '18:00–19:30',
    classroom: 'A-101',
  },
  {
    group: 'B Grubu',
    course: 'Fizik',
    teacher: 'Ayşe Kaya',
    day: 'Çarşamba',
    time: '19:00–20:30',
    classroom: 'A-102',
  },
  {
    group: 'A Grubu',
    course: 'Geometri',
    teacher: 'Ahmet Yılmaz',
    day: 'Perşembe',
    time: '20:00–21:30',
    classroom: 'A-101',
  },
  {
    group: 'C Grubu',
    course: 'Kimya',
    teacher: 'Elif Demir',
    day: 'Pazartesi',
    time: '18:00–19:30',
    classroom: 'B-201',
  },
  {
    group: 'B Grubu',
    course: 'Biyoloji',
    teacher: 'Elif Demir',
    day: 'Cuma',
    time: '17:30–19:00',
    classroom: 'B-201',
  },
];

const COLUMNS: { key: keyof ScheduleRow; label: string }[] = [
  { key: 'group', label: 'Grup' },
  { key: 'course', label: 'Ders' },
  { key: 'teacher', label: 'Öğretmen' },
  { key: 'day', label: 'Gün' },
  { key: 'time', label: 'Saat' },
  { key: 'classroom', label: 'Derslik' },
];

type SortDir = 'asc' | 'desc';

export function ScheduleTable() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof ScheduleRow>('day');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(key: keyof ScheduleRow) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const rows = useMemo(() => {
    const filtered = SAMPLE_ROWS.filter((row) =>
      Object.values(row).some((v) => v.toLowerCase().includes(search.toLowerCase())),
    );
    return [...filtered].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey], 'tr');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [search, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-neutral-900">Ders Programı</h2>
          <p className="text-sm text-neutral-500">Haftalık tekrar eden ders saatleri</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Plus size={16} strokeWidth={2} />
          Yeni Ders Programı
        </button>
      </div>

      {/* Arama + filtre/disa aktar araç çubuğu */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Grup, ders veya öğretmen ara…"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          Filtrele
        </button>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          <Download size={15} strokeWidth={1.75} />
          Dışa Aktar
        </button>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-lg border border-neutral-100">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase hover:text-neutral-800"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp size={13} strokeWidth={2} />
                      ) : (
                        <ChevronDown size={13} strokeWidth={2} />
                      )
                    ) : (
                      <ChevronsUpDown size={13} strokeWidth={2} className="text-neutral-300" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-neutral-400"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.group}-${row.course}-${i}`} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-medium text-neutral-800">{row.group}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{row.course}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{row.teacher}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{row.day}</td>
                  <td className="px-4 py-2.5 text-neutral-600 [font-variant-numeric:tabular-nums]">
                    {row.time}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{row.classroom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama - ornek veri tek sayfaya sigdigi icin ileri/geri devre disi */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
        <span className="text-neutral-400">
          Toplam <strong className="font-semibold text-neutral-600">{rows.length}</strong> kayıt
          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase">
            Örnek veri
          </span>
        </span>
        <div className="flex items-center gap-1">
          {['İlk', 'Önceki', 'Sonraki', 'Son'].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-300',
                'cursor-not-allowed',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
