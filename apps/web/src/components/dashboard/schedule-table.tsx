'use client';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';

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

const columns: DataTableColumn<ScheduleRow>[] = [
  {
    key: 'group',
    label: 'Grup',
    sortable: true,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.group}</span>
    ),
  },
  { key: 'course', label: 'Ders', sortable: true, render: (r) => r.course },
  { key: 'teacher', label: 'Öğretmen', sortable: true, render: (r) => r.teacher },
  { key: 'day', label: 'Gün', sortable: true, render: (r) => r.day },
  { key: 'time', label: 'Saat', sortable: true, render: (r) => r.time },
  { key: 'classroom', label: 'Derslik', sortable: true, render: (r) => r.classroom },
];

export function ScheduleTable() {
  return (
    <DataTable
      title="Ders Programı"
      subtitle="Haftalık tekrar eden ders saatleri"
      columns={columns}
      rows={SAMPLE_ROWS}
      getRowId={(r) => `${r.group}-${r.course}-${r.day}`}
      searchPlaceholder="Grup, ders veya öğretmen ara…"
      searchText={(r) => `${r.group} ${r.course} ${r.teacher} ${r.day} ${r.classroom}`}
      primaryActionLabel="Yeni Ders Programı"
      sample
    />
  );
}
