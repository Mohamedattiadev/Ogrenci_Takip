'use client';

import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { formatDateTr, type AttendanceRecord, type AttendanceStatus } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';
import { AttendanceEntry } from './attendance-entry';

const STATUS_TONE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-status-presentBg text-status-present dark:bg-status-present/15',
  ABSENT:
    'bg-status-absentUnexcusedBg text-status-absentUnexcused dark:bg-status-absentUnexcused/15',
  EXCUSED: 'bg-status-excusedBg text-status-excused dark:bg-status-excused/15',
  LATE: 'bg-status-lateBg text-status-late dark:bg-status-late/15',
  ABSENT_EXCUSED:
    'bg-status-absentExcusedBg text-status-absentExcused dark:bg-status-absentExcused/15',
  ABSENT_UNEXCUSED:
    'bg-status-absentUnexcusedBg text-status-absentUnexcused dark:bg-status-absentUnexcused/15',
};

const columns: DataTableColumn<AttendanceRecord>[] = [
  {
    key: 'student',
    label: 'Öğrenci',
    sortable: true,
    sortValue: (r) => r.student.fullName,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">
        {r.student.fullName}
      </span>
    ),
  },
  {
    key: 'group',
    label: 'Grup',
    sortable: true,
    sortValue: (r) => r.group.name,
    render: (r) => r.group.name,
  },
  {
    key: 'course',
    label: 'Ders',
    sortable: true,
    sortValue: (r) => r.course.name,
    render: (r) => r.course.name,
  },
  {
    key: 'date',
    label: 'Tarih',
    sortable: true,
    sortValue: (r) => `${r.session.date} ${r.session.startTime}`,
    render: (r) => `${formatDateTr(r.session.date)} ${r.session.startTime}`,
  },
  {
    key: 'status',
    label: 'Durum',
    sortable: true,
    sortValue: (r) => r.statusLabel,
    render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[r.status]}`}>
        {r.statusLabel}
      </span>
    ),
  },
];

export function AttendanceTable() {
  const list = usePagedList<AttendanceRecord>('attendance', {}, 50);
  return (
    <div className="space-y-5">
      <AttendanceEntry onSaved={list.reload} />
      <DataTable
        title="Yoklama"
        subtitle="Girilen yoklama kayıtları (en yeni ders önce)"
        columns={columns}
        rows={list.rows}
        getRowId={(r) => r.id}
        searchPlaceholder="Öğrenci adı veya numarası ara…"
        onSearchChange={list.onSearchChange}
        pagination={list.pagination}
        loading={list.loading}
        error={list.error}
        emptyLabel="Henüz yoklama kaydı yok."
      />
    </div>
  );
}
