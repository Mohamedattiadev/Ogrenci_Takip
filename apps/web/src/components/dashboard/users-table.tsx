'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { UserForm } from '@/components/forms/user-form';
import { useManageAccess } from '@/lib/form';
import { ROLE_LABELS, type UserRole } from '@/lib/session';
import type { User } from '@/lib/types';
import { usePagedList } from '@/lib/use-paged-list';

const ROLE_TONE: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-mark-50 text-mark-600 dark:bg-mark-500/15 dark:text-mark-400',
  INSTITUTION_ADMIN: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  TEACHER: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
  GROUP_LEADER: 'bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-400',
};

const columns: DataTableColumn<User>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    sortable: true,
    sortValue: (r) => r.fullName,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.fullName}</span>
    ),
  },
  {
    key: 'email',
    label: 'E-posta',
    sortable: true,
    sortValue: (r) => r.email,
    render: (r) => r.email,
  },
  {
    key: 'role',
    label: 'Rol',
    sortable: true,
    sortValue: (r) => ROLE_LABELS[r.role],
    render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_TONE[r.role]}`}>
        {ROLE_LABELS[r.role]}
      </span>
    ),
  },
  { key: 'institution', label: 'Kurum', render: (r) => r.institution?.name ?? '—' },
  {
    key: 'active',
    label: 'Durum',
    render: (r) => (
      <span
        className={
          r.isActive
            ? 'rounded-full bg-status-presentBg px-2.5 py-1 text-xs font-semibold text-status-present dark:bg-status-present/15'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
        }
      >
        {r.isActive ? 'Aktif' : 'Pasif'}
      </span>
    ),
  },
];

export function UsersTable() {
  const list = usePagedList<User>('users');
  const { canManage } = useManageAccess();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <DataTable
        title="Kullanıcılar"
        subtitle="Sistem ve yurt kullanıcıları (yurda görevlendirilmiş hocalar dahil)"
        columns={columns}
        rows={list.rows}
        getRowId={(r) => r.id}
        searchPlaceholder="Ad veya e-posta ara…"
        onSearchChange={list.onSearchChange}
        pagination={list.pagination}
        loading={list.loading}
        error={list.error}
        primaryActionLabel={canManage ? 'Yeni Kullanıcı' : undefined}
        primaryActionIcon={UserPlus}
        onPrimaryAction={() => setCreating(true)}
      />
      {creating ? <UserForm onClose={() => setCreating(false)} onCreated={list.reload} /> : null}
    </>
  );
}
