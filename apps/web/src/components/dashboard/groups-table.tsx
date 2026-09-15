'use client';

import { FolderPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';

interface GroupRow {
  name: string;
  term: string;
  studentCount: number;
  createdAt: string;
}

const SAMPLE: GroupRow[] = [
  { name: 'A Grubu', term: '2026-2027', studentCount: 12, createdAt: '01.10.2026' },
  { name: 'B Grubu', term: '2026-2027', studentCount: 9, createdAt: '01.10.2026' },
  { name: 'C Grubu', term: '2026-2027', studentCount: 15, createdAt: '03.10.2026' },
];

const columns: DataTableColumn<GroupRow>[] = [
  {
    key: 'name',
    label: 'Grup Adı',
    sortable: true,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.name}</span>
    ),
  },
  { key: 'term', label: 'Dönem', sortable: true, render: (r) => r.term },
  {
    key: 'studentCount',
    label: 'Öğrenci Sayısı',
    sortable: true,
    align: 'right',
    sortValue: (r) => r.studentCount,
    render: (r) => r.studentCount,
  },
  { key: 'createdAt', label: 'Oluşturulma', sortable: true, render: (r) => r.createdAt },
];

export function GroupsTable() {
  return (
    <DataTable
      title="Gruplar"
      subtitle="Sınıf/grup listesi ve öğrenci sayıları"
      columns={columns}
      rows={SAMPLE}
      getRowId={(r) => r.name}
      searchPlaceholder="Grup adı ara…"
      searchText={(r) => `${r.name} ${r.term}`}
      primaryActionLabel="Yeni Grup"
      primaryActionIcon={FolderPlus}
      sample
    />
  );
}
