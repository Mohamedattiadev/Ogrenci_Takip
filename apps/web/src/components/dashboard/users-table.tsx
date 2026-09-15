'use client';

import { UserPlus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';

type Role = 'Sistem Yöneticisi' | 'Kurum Yöneticisi' | 'Öğretmen';

interface UserRow {
  name: string;
  email: string;
  role: Role;
  institution: string;
  active: boolean;
}

const ROLE_TONE: Record<Role, string> = {
  'Sistem Yöneticisi': 'bg-mark-50 text-mark-600 dark:bg-mark-500/15 dark:text-mark-400',
  'Kurum Yöneticisi': 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  Öğretmen: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300',
};

const SAMPLE: UserRow[] = [
  {
    name: 'Sistem Yöneticisi',
    email: 'sistem.yoneticisi@example.org',
    role: 'Sistem Yöneticisi',
    institution: '—',
    active: true,
  },
  {
    name: 'Kurum Yöneticisi',
    email: 'kurum.yoneticisi@example.org',
    role: 'Kurum Yöneticisi',
    institution: 'Merkez Yurt',
    active: true,
  },
  {
    name: 'Ahmet Yılmaz',
    email: 'ogretmen@example.org',
    role: 'Öğretmen',
    institution: 'Merkez Yurt',
    active: true,
  },
  {
    name: 'Ayşe Kaya',
    email: 'ayse.kaya@example.org',
    role: 'Öğretmen',
    institution: 'Merkez Yurt',
    active: true,
  },
];

const columns: DataTableColumn<UserRow>[] = [
  {
    key: 'name',
    label: 'Ad Soyad',
    sortable: true,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.name}</span>
    ),
  },
  { key: 'email', label: 'E-posta', sortable: true, render: (r) => r.email },
  {
    key: 'role',
    label: 'Rol',
    sortable: true,
    render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_TONE[r.role]}`}>
        {r.role}
      </span>
    ),
  },
  { key: 'institution', label: 'Kurum', render: (r) => r.institution },
  {
    key: 'active',
    label: 'Durum',
    render: (r) => (
      <span
        className={
          r.active
            ? 'rounded-full bg-status-presentBg px-2.5 py-1 text-xs font-semibold text-status-present dark:bg-status-present/15'
            : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-white/5 dark:text-neutral-400'
        }
      >
        {r.active ? 'Aktif' : 'Pasif'}
      </span>
    ),
  },
];

export function UsersTable() {
  return (
    <DataTable
      title="Kullanıcılar"
      subtitle="Sistem ve kurum kullanıcıları"
      columns={columns}
      rows={SAMPLE}
      getRowId={(r) => r.email}
      searchPlaceholder="Ad, e-posta veya rol ara…"
      searchText={(r) => `${r.name} ${r.email} ${r.role} ${r.institution}`}
      primaryActionLabel="Yeni Kullanıcı"
      primaryActionIcon={UserPlus}
      sample
    />
  );
}
