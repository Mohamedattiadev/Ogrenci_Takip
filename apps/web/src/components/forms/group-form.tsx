'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import {
  compact,
  useManageAccess,
  useOptions,
  type ScholarshipProgramOption,
  type TermOption,
} from '@/lib/form';
import type { Institution } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

export function GroupForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user, isSuperAdmin } = useManageAccess();
  const [form, setForm] = useState({
    institutionId: '',
    termId: '',
    name: '',
    scholarshipProgramId: '',
  });
  const set =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const institutionId = isSuperAdmin ? form.institutionId : (user?.institutionId ?? '');
  const institutions = useOptions<Institution>(isSuperAdmin ? 'institutions' : null, {
    isActive: true,
  });
  const terms = useOptions<TermOption>(institutionId ? 'terms' : null, { institutionId });
  const programs = useOptions<ScholarshipProgramOption>('scholarship-programs', { isActive: true });

  async function submit() {
    await apiJson('groups', {
      method: 'POST',
      body: compact({
        institutionId: isSuperAdmin ? institutionId : undefined,
        termId: form.termId,
        name: form.name,
        scholarshipProgramId: form.scholarshipProgramId,
      }),
    });
    onCreated();
  }

  const noTerms = Boolean(institutionId) && !terms.loading && terms.items.length === 0;
  return (
    <FormShell
      title="Yeni Grup"
      description="Grup bir yurt, dönem ve (isteğe bağlı) burs programına aittir"
      submitLabel="Grubu Oluştur"
      onClose={onClose}
      onSubmit={submit}
    >
      {isSuperAdmin ? (
        <FullWidth>
          <SelectField
            id="group-institution"
            label="Yurt *"
            value={form.institutionId}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                institutionId: event.target.value,
                termId: '',
              }))
            }
            options={institutions.items.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={institutions.loading ? 'Yükleniyor…' : 'Yurt seçin'}
            required
          />
        </FullWidth>
      ) : null}
      <FullWidth>
        <Field
          id="group-name"
          label="Grup Adı *"
          value={form.name}
          onChange={set('name')}
          required
          maxLength={80}
          placeholder="ör. İlahiyat Akademi - A Grubu"
        />
      </FullWidth>
      <SelectField
        id="group-term"
        label="Dönem *"
        value={form.termId}
        onChange={set('termId')}
        options={terms.items.map((t) => ({ value: t.id, label: t.name }))}
        placeholder={institutionId ? 'Dönem seçin' : 'Önce yurt seçin'}
        disabled={!institutionId}
        hint={noTerms ? 'Bu yurtta tanımlı dönem yok.' : undefined}
        required
      />
      <SelectField
        id="group-program"
        label="Burs Programı"
        value={form.scholarshipProgramId}
        onChange={set('scholarshipProgramId')}
        options={programs.items.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Karma (programsız)"
        hint="Program seçilirse yalnızca o programın öğrencileri eklenebilir."
      />
    </FormShell>
  );
}
