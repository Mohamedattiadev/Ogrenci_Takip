'use client';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import type { Schedule } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

const columns: DataTableColumn<Schedule>[] = [
  {
    key: 'group',
    label: 'Grup',
    sortable: true,
    sortValue: (r) => r.group.name,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.group.name}</span>
    ),
  },
  {
    key: 'course',
    label: 'Ders',
    sortable: true,
    sortValue: (r) => r.course.name,
    render: (r) => r.course.name,
  },
  {
    key: 'teacher',
    label: 'Öğretmen',
    sortable: true,
    sortValue: (r) => r.teacher?.name ?? '',
    render: (r) => r.teacher?.name ?? '—',
  },
  { key: 'institution', label: 'Yurt', render: (r) => r.institution?.name ?? '—' },
  {
    key: 'day',
    label: 'Gün',
    sortable: true,
    sortValue: (r) => r.dayOfWeek * 10000 + Number(r.startTime.replace(':', '')),
    render: (r) => r.dayName,
  },
  {
    key: 'time',
    label: 'Saat',
    sortable: true,
    sortValue: (r) => r.startTime,
    render: (r) => (
      <span className="[font-variant-numeric:tabular-nums]">{`${r.startTime}–${r.endTime}`}</span>
    ),
  },
  { key: 'classroom', label: 'Derslik', render: (r) => r.classroom ?? '—' },
];

export function ScheduleTable() {
  const list = usePagedList<Schedule>('schedules', {}, 50);
  return (
    <DataTable
      title="Ders Programı"
      subtitle="Haftalık tekrar eden ders saatleri"
      columns={columns}
      rows={list.rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Grup, ders, öğretmen veya derslik ara…"
      onSearchChange={list.onSearchChange}
      pagination={list.pagination}
      loading={list.loading}
      error={list.error}
      primaryActionLabel="Yeni Ders Programı"
    />
  );
}
