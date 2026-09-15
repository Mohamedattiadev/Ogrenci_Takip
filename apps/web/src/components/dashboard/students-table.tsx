'use client';

import { UserPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';

interface StudentRow {
  no: string;
  firstName: string;
  lastName: string;
  group: string;
  guardian: string;
  status: 'Aktif' | 'Ayrılmış';
}

const SAMPLE: StudentRow[] = [
  {
    no: '2026001',
    firstName: 'Ayşe',
    lastName: 'Demir',
    group: 'A Grubu',
    guardian: 'Fatma Demir',
    status: 'Aktif',
  },
  {
    no: '2026002',
    firstName: 'Berkay',
    lastName: 'Koç',
    group: 'A Grubu',
    guardian: 'Hasan Koç',
    status: 'Aktif',
  },
  {
    no: '2026003',
    firstName: 'Cemre',
    lastName: 'Aydın',
    group: 'B Grubu',
    guardian: 'Zeynep Aydın',
    status: 'Aktif',
  },
  {
    no: '2026004',
    firstName: 'Deniz',
    lastName: 'Şahin',
    group: 'B Grubu',
    guardian: 'Mehmet Şahin',
    status: 'Aktif',
  },
  {
    no: '2026005',
    firstName: 'Elif',
    lastName: 'Yıldız',
    group: 'C Grubu',
    guardian: 'Ali Yıldız',
    status: 'Ayrılmış',
  },
];

const columns: DataTableColumn<StudentRow>[] = [
  {
    key: 'no',
    label: 'Öğrenci No',
    sortable: true,
    render: (r) => <span className="font-medium text-neutral-800">{r.no}</span>,
  },
  {
    key: 'name',
    label: 'Ad Soyad',
    sortable: true,
    sortValue: (r) => `${r.firstName} ${r.lastName}`,
    render: (r) => `${r.firstName} ${r.lastName}`,
  },
  { key: 'group', label: 'Grup', sortable: true, render: (r) => r.group },
  { key: 'guardian', label: 'Veli', render: (r) => r.guardian },
  {
    key: 'status',
    label: 'Durum',
    sortable: true,
    render: (r) => (
      <span
        className={
          r.status === 'Aktif'
            ? 'rounded-full bg-status-presentBg px-2.5 py-1 text-xs font-semibold text-status-present'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500'
        }
      >
        {r.status}
      </span>
    ),
  },
];

export function StudentsTable() {
  return (
    <DataTable
      title="Öğrenciler"
      subtitle="Kayıtlı öğrenci listesi"
      columns={columns}
      rows={SAMPLE}
      getRowId={(r) => r.no}
      searchPlaceholder="Öğrenci no, ad veya grup ara…"
      searchText={(r) => `${r.no} ${r.firstName} ${r.lastName} ${r.group} ${r.guardian}`}
      primaryActionLabel="Yeni Öğrenci"
      primaryActionIcon={UserPlus}
      sample
    />
  );
}
