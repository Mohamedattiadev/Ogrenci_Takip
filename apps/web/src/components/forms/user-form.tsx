'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import { compact, useManageAccess, useOptions } from '@/lib/form';
import { ROLE_LABELS, type UserRole } from '@/lib/session';
import type { Institution } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

export function UserForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { isSuperAdmin } = useManageAccess();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'TEACHER' as UserRole,
    institutionId: '',
  });
  const set =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const institutions = useOptions<Institution>(isSuperAdmin ? 'institutions' : null, {
    isActive: true,
  });
  const roles: UserRole[] = isSuperAdmin
    ? ['TEACHER', 'INSTITUTION_ADMIN', 'SUPER_ADMIN']
    : ['TEACHER', 'INSTITUTION_ADMIN'];
  const needsInstitution = isSuperAdmin && form.role !== 'SUPER_ADMIN';

  async function submit() {
    await apiJson('users', {
      method: 'POST',
      body: compact({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        institutionId: needsInstitution ? form.institutionId : undefined,
      }),
    });
    onCreated();
  }

  return (
    <FormShell
      title="Yeni Kullanıcı"
      description="Hoca veya yönetici hesabı. Hocanın ders verdiği yurt ve programlar ayrıca görevlendirilir."
      submitLabel="Kullanıcıyı Oluştur"
      onClose={onClose}
      onSubmit={submit}
    >
      <Field
        id="user-name"
        label="Ad Soyad *"
        value={form.fullName}
        onChange={set('fullName')}
        required
        maxLength={120}
      />
      <Field
        id="user-email"
        label="E-posta *"
        type="email"
        value={form.email}
        onChange={set('email')}
        required
        autoComplete="off"
      />
      <Field
        id="user-password"
        label="Geçici Şifre *"
        type="text"
        value={form.password}
        onChange={set('password')}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="En az 8 karakter"
      />
      <SelectField
        id="user-role"
        label="Rol *"
        value={form.role}
        onChange={set('role')}
        options={roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
        required
      />
      {needsInstitution ? (
        <FullWidth>
          <SelectField
            id="user-institution"
            label="Bağlı Olduğu Yurt *"
            value={form.institutionId}
            onChange={set('institutionId')}
            options={institutions.items.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={institutions.loading ? 'Yükleniyor…' : 'Yurt seçin'}
            required
          />
        </FullWidth>
      ) : null}
    </FormShell>
  );
}
