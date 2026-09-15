'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, KeyRound, UserPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { GroupTransferForm } from '@/components/forms/group-transfer-form';
import { StudentAccountForm } from '@/components/forms/student-account-form';
import { StudentForm } from '@/components/forms/student-form';
import { downloadFile } from '@/lib/api';
import { useManageAccess } from '@/lib/form';
import type { Student } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

function GroupCell({
  student,
  canMove,
  onOpen,
}: {
  student: Student;
  canMove: boolean;
  onOpen: () => void;
}) {
  const label = student.groups.length ? student.groups.map((g) => g.name).join(', ') : '—';
  if (!canMove || student.groups.length !== 1) return <>{label}</>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 text-left text-neutral-700 hover:text-brand-700 dark:text-neutral-300 dark:hover:text-brand-300"
      title="Grubu değiştir"
    >
      <ArrowLeftRight size={14} className="shrink-0" />
      {label}
    </button>
  );
}

const baseColumns: DataTableColumn<Student>[] = [
  {
    key: 'studentNumber',
    label: 'Öğrenci No',
    sortable: true,
    sortValue: (r) => r.studentNumber,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.studentNumber}</span>
    ),
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
            ? 'rounded-full bg-status-presentBg px-2.5 py-1 text-xs font-semibold text-status-present dark:bg-status-present/15'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
        }
      >
        {r.status === 'ACTIVE' ? 'Aktif' : 'Ayrılmış'}
      </span>
    ),
  },
];

export function StudentsTable() {
  const list = usePagedList<Student>('students', { status: 'all' });
  const { canManage, canMoveGroup } = useManageAccess();
  const [creating, setCreating] = useState(false);
  const [accountFor, setAccountFor] = useState<Student | null>(null);
  const [transferFor, setTransferFor] = useState<Student | null>(null);

  const columns = useMemo<DataTableColumn<Student>[]>(() => {
    const guardianIndex = baseColumns.findIndex((c) => c.key === 'guardian');
    const withGroups: DataTableColumn<Student>[] = [
      ...baseColumns.slice(0, guardianIndex),
      {
        key: 'groups',
        label: 'Grup',
        render: (r) => (
          <GroupCell student={r} canMove={canMoveGroup} onOpen={() => setTransferFor(r)} />
        ),
      },
      ...baseColumns.slice(guardianIndex),
    ];
    if (!canManage) return withGroups;
    return [
      ...withGroups,
      {
        key: 'account',
        label: 'Giriş Hesabı',
        render: (r) =>
          r.account ? (
            <button
              type="button"
              onClick={() => setAccountFor(r)}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-700 hover:text-brand-700 dark:text-neutral-300 dark:hover:text-brand-300"
              title="Hesabı yönet"
            >
              <KeyRound size={14} />
              {r.account.username}
              {!r.account.isActive ? (
                <span className="text-xs text-status-danger">(kapalı)</span>
              ) : r.account.mustChangePassword ? (
                <span className="text-xs text-neutral-400">(ilk giriş bekleniyor)</span>
              ) : null}
            </button>
          ) : r.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() => setAccountFor(r)}
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-neutral-700 dark:text-brand-300 dark:hover:bg-brand-900/40"
            >
              Hesap aç
            </button>
          ) : (
            <span className="text-neutral-400">—</span>
          ),
      },
    ];
  }, [canManage, canMoveGroup]);

  return (
    <>
      <DataTable
        title="Öğrenciler"
        subtitle="Yurt, burs programı, grup ve giriş hesabı bilgileriyle kayıtlı öğrenciler"
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
        primaryActionLabel={canManage ? 'Yeni Öğrenci' : undefined}
        primaryActionIcon={UserPlus}
        onPrimaryAction={() => setCreating(true)}
      />
      {creating ? <StudentForm onClose={() => setCreating(false)} onCreated={list.reload} /> : null}
      {accountFor ? (
        <StudentAccountForm
          student={accountFor}
          onClose={() => setAccountFor(null)}
          onChanged={list.reload}
        />
      ) : null}
      {transferFor ? (
        <GroupTransferForm
          student={transferFor}
          onClose={() => setTransferFor(null)}
          onChanged={list.reload}
        />
      ) : null}
    </>
  );
}
