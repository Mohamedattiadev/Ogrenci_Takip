'use client';

import { FolderPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { formatDateTr, type Group } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

const columns: DataTableColumn<Group>[] = [
  {
    key: 'name',
    label: 'Grup Adı',
    sortable: true,
    sortValue: (r) => r.name,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.name}</span>
    ),
  },
  { key: 'institution', label: 'Yurt', render: (r) => r.institution?.name ?? '—' },
  {
    key: 'program',
    label: 'Burs Programı',
    render: (r) => r.scholarshipProgram?.name ?? 'Karma',
  },
  {
    key: 'term',
    label: 'Dönem',
    sortable: true,
    sortValue: (r) => r.term.name,
    render: (r) => r.term.name,
  },
  {
    key: 'activeStudentCount',
    label: 'Öğrenci Sayısı',
    sortable: true,
    align: 'right',
    sortValue: (r) => r.activeStudentCount,
    render: (r) => r.activeStudentCount,
  },
  {
    key: 'createdAt',
    label: 'Oluşturulma',
    sortable: true,
    sortValue: (r) => r.createdAt,
    render: (r) => formatDateTr(r.createdAt),
  },
];

export function GroupsTable() {
  const list = usePagedList<Group>('groups');
  return (
    <DataTable
      title="Gruplar"
      subtitle="Yurt ve burs programına göre ders grupları ve aktif öğrenci sayıları"
      columns={columns}
      rows={list.rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Grup adı ara…"
      onSearchChange={list.onSearchChange}
      pagination={list.pagination}
      loading={list.loading}
      error={list.error}
      primaryActionLabel="Yeni Grup"
      primaryActionIcon={FolderPlus}
    />
  );
}
