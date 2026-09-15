'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ClipboardPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { AssignmentForm } from '@/components/forms/assignment-form';
import { Badge } from '@/components/portal/ui';
import { useLiveEvents } from '@/lib/live';
import type { StaffAssignment } from '@/lib/portal-types';
import { formatDateTime } from '@/lib/portal-types';
import { usePagedList } from '@/lib/use-paged-list';

const columns: DataTableColumn<StaffAssignment>[] = [
  {
    key: 'title',
    label: 'Ödev',
    sortable: true,
    sortValue: (r) => r.title,
    render: (r) => (
      <Link
        href={`/dashboard/assignments/${r.id}`}
        className="font-medium text-brand-700 hover:underline dark:text-brand-300"
      >
        {r.title}
      </Link>
    ),
  },
  { key: 'course', label: 'Ders', render: (r) => r.course.name },
  { key: 'group', label: 'Grup', render: (r) => r.group.name },
  { key: 'teacher', label: 'Hoca', render: (r) => r.teacher?.name ?? '—' },
  {
    key: 'dueAt',
    label: 'Son Teslim',
    sortable: true,
    sortValue: (r) => r.dueAt ?? '9999',
    render: (r) => (r.dueAt ? formatDateTime(r.dueAt) : 'Süresiz'),
  },
  {
    key: 'submitted',
    label: 'Teslim',
    align: 'right',
    sortable: true,
    sortValue: (r) => r.submittedCount,
    render: (r) => `${r.submittedCount} / ${r.rosterSize}`,
  },
  {
    key: 'status',
    label: 'Durum',
    render: (r) => (r.isOpen ? <Badge tone="success">Açık</Badge> : <Badge>Kapandı</Badge>),
  },
];

export function AssignmentsTable() {
  const list = usePagedList<StaffAssignment>('assignments');
  const [creating, setCreating] = useState(false);
  const reload = list.reload;

  // Ogrenci teslim edince sayilar sayfa yenilemeden guncellenir.
  useLiveEvents(
    useCallback(
      (event) => {
        if (event.type.startsWith('submission.') || event.type.startsWith('assignment.')) reload();
      },
      [reload],
    ),
  );

  return (
    <>
      <DataTable
        title="Ödevler"
        subtitle="Derslerinize verilen ödevler ve teslim sayıları (canlı güncellenir)"
        columns={columns}
        rows={list.rows}
        getRowId={(r) => r.id}
        searchPlaceholder="Ödev başlığı ara…"
        onSearchChange={list.onSearchChange}
        pagination={list.pagination}
        loading={list.loading}
        error={list.error}
        primaryActionLabel="Yeni Ödev"
        primaryActionIcon={ClipboardPlus}
        onPrimaryAction={() => setCreating(true)}
        emptyLabel="Henüz ödev verilmemiş."
      />
      {creating ? <AssignmentForm onClose={() => setCreating(false)} onCreated={reload} /> : null}
    </>
  );
}
