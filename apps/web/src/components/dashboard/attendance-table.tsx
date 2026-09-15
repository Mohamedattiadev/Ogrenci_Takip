'use client';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';

type Status =
  'Geldi' | 'Gelmedi' | 'İzinli' | 'Geç Geldi' | 'Haberli Devamsız' | 'Habersiz Devamsız';

interface AttendanceRow {
  student: string;
  group: string;
  course: string;
  date: string;
  status: Status;
}

const STATUS_TONE: Record<Status, string> = {
  Geldi: 'bg-status-presentBg text-status-present',
  Gelmedi: 'bg-status-absentUnexcusedBg text-status-absentUnexcused',
  İzinli: 'bg-status-excusedBg text-status-excused',
  'Geç Geldi': 'bg-status-lateBg text-status-late',
  'Haberli Devamsız': 'bg-status-absentExcusedBg text-status-absentExcused',
  'Habersiz Devamsız': 'bg-status-absentUnexcusedBg text-status-absentUnexcused',
};

const SAMPLE: AttendanceRow[] = [
  {
    student: 'Ayşe Demir',
    group: 'A Grubu',
    course: 'Matematik',
    date: '06.10.2026',
    status: 'Geldi',
  },
  {
    student: 'Berkay Koç',
    group: 'A Grubu',
    course: 'Matematik',
    date: '06.10.2026',
    status: 'Geldi',
  },
  {
    student: 'Cemre Aydın',
    group: 'B Grubu',
    course: 'Fizik',
    date: '06.10.2026',
    status: 'Habersiz Devamsız',
  },
  {
    student: 'Deniz Şahin',
    group: 'B Grubu',
    course: 'Fizik',
    date: '06.10.2026',
    status: 'İzinli',
  },
  {
    student: 'Elif Yıldız',
    group: 'C Grubu',
    course: 'Kimya',
    date: '05.10.2026',
    status: 'Geç Geldi',
  },
  {
    student: 'Berkay Koç',
    group: 'A Grubu',
    course: 'Geometri',
    date: '05.10.2026',
    status: 'Haberli Devamsız',
  },
];

const columns: DataTableColumn<AttendanceRow>[] = [
  {
    key: 'student',
    label: 'Öğrenci',
    sortable: true,
    render: (r) => <span className="font-medium text-neutral-800">{r.student}</span>,
  },
  { key: 'group', label: 'Grup', sortable: true, render: (r) => r.group },
  { key: 'course', label: 'Ders', sortable: true, render: (r) => r.course },
  { key: 'date', label: 'Tarih', sortable: true, render: (r) => r.date },
  {
    key: 'status',
    label: 'Durum',
    sortable: true,
    render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[r.status]}`}>
        {r.status}
      </span>
    ),
  },
];

export function AttendanceTable() {
  return (
    <DataTable
      title="Yoklama"
      subtitle="Girilen yoklama kayıtları"
      columns={columns}
      rows={SAMPLE}
      getRowId={(r) => `${r.student}-${r.course}-${r.date}`}
      searchPlaceholder="Öğrenci, grup veya ders ara…"
      searchText={(r) => `${r.student} ${r.group} ${r.course} ${r.status}`}
      sample
    />
  );
}
