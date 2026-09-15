'use client';

import { UserPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { downloadFile } from '@/lib/api';
import type { Student } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

const columns: DataTableColumn<Student>[] = [
  {
    key: 'studentNumber',
    label: 'Öğrenci No',
    sortable: true,
    sortValue: (r) => r.studentNumber,
    render: (r) => <span className="font-medium text-neutral-800">{r.studentNumber}</span>,
  },
  {
    key: 'name',
    label: 'Ad Soyad',
    sortable: true,
    sortValue: (r) => `${r.lastName} ${r.firstName}`,
    render: (r) => r.fullName,
  },
  { key: 'institution', label: 'Yurt', render: (r) => r.institution?.name ?? '—' },
  { key: 'program', label: 'Burs Programı', render: (r) => r.scholarshipProgram?.name ?? '—' },
  {
    key: 'groups',
    label: 'Grup',
    render: (r) => (r.groups.length ? r.groups.map((g) => g.name).join(', ') : '—'),
  },
  { key: 'guardian', label: 'Veli', render: (r) => r.guardian.name ?? '—' },
  {
    key: 'status',
    label: 'Durum',
    sortable: true,
    sortValue: (r) => r.status,
    render: (r) => (
      <span
        className={
          r.status === 'ACTIVE'
            ? 'rounded-full bg-status-presentBg px-2.5 py-1 text-xs font-semibold text-status-present'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500'
        }
      >
        {r.status === 'ACTIVE' ? 'Aktif' : 'Ayrılmış'}
      </span>
    ),
  },
];

export function StudentsTable() {
  const list = usePagedList<Student>('students', { status: 'all' });
  return (
    <DataTable
      title="Öğrenciler"
      subtitle="Yurt, burs programı ve grup bilgileriyle kayıtlı öğrenciler"
      columns={columns}
      rows={list.rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Öğrenci no, ad veya soyad ara…"
      onSearchChange={list.onSearchChange}
      pagination={list.pagination}
      loading={list.loading}
      error={list.error}
      onExport={() =>
        void downloadFile('students/export', {
          format: 'excel',
          status: 'all',
          search: list.search,
        })
      }
      primaryActionLabel="Yeni Öğrenci"
      primaryActionIcon={UserPlus}
    />
  );
}
