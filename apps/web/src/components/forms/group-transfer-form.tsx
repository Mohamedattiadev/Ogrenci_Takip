'use client';

import { useMemo, useState } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import { compact, todayIso, useOptions } from '@/lib/form';
import type { Group, Student } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

/**
 * Ogrenciyi ayni yurt + ayni burs programi icindeki baska bir gruba tasir. Admin veya
 * ogrencinin hocasi acabilir; gercek sinir (hoca ise hedefi de kendisinin ogretmesi) API/RLS'te
 * uygulanir (bkz. dormitory-policies.sql) - burada yalnizca ayni program filtrelenir.
 */
export function GroupTransferForm({
  student,
  onClose,
  onChanged,
}: {
  student: Student;
  onClose: () => void;
  onChanged: () => void;
}) {
  const currentGroup = student.groups[0];
  const [toGroupId, setToGroupId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayIso());

  const candidates = useOptions<Group>(student.institution ? 'groups' : null, {
    institutionId: student.institution?.id,
  });
  // Hedef her zaman ayni burs programinda (veya karma) kalmak zorunda - DB tetikleyicisi de
  // bunu zorunlu kilar, burada onceden filtrelenerek listede gorunmez.
  const options = useMemo(
    () =>
      candidates.items
        .filter((g) => g.id !== currentGroup?.id)
        .filter(
          (g) =>
            g.scholarshipProgram === null ||
            g.scholarshipProgram.id === student.scholarshipProgram?.id,
        )
        .map((g) => ({ value: g.id, label: g.name })),
    [candidates.items, currentGroup?.id, student.scholarshipProgram?.id],
  );

  async function submit() {
    await apiJson(`students/${student.id}/group-transfers`, {
      method: 'POST',
      body: compact({
        fromGroupId: currentGroup?.id,
        toGroupId,
        effectiveDate,
      }),
    });
    onChanged();
  }

  if (!currentGroup) {
    return (
      <FormShell
        title="Grup Değiştir"
        description={`${student.fullName} · ${student.studentNumber}`}
        submitLabel="Kapat"
        onClose={onClose}
        onSubmit={async () => onClose()}
      >
        <FullWidth>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Öğrencinin aktif bir grup üyeliği yok; önce bir gruba eklenmesi gerekir.
          </p>
        </FullWidth>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Grup Değiştir"
      description={`${student.fullName} · ${student.studentNumber}`}
      submitLabel="Taşı"
      onClose={onClose}
      onSubmit={submit}
    >
      <FullWidth>
        <Field id="transfer-current" label="Mevcut Grup" value={currentGroup.name} readOnly />
      </FullWidth>
      <FullWidth>
        <SelectField
          id="transfer-target"
          label="Yeni Grup *"
          value={toGroupId}
          onChange={(e) => setToGroupId(e.target.value)}
          options={options}
          placeholder={candidates.loading ? 'Yükleniyor…' : 'Grup seçin'}
          hint="Yalnızca aynı yurt ve aynı burs programındaki gruplar listelenir."
          required
        />
      </FullWidth>
      <Field
        id="transfer-date"
        label="Geçerlilik Tarihi *"
        type="date"
        value={effectiveDate}
        onChange={(e) => setEffectiveDate(e.target.value)}
        required
      />
    </FormShell>
  );
}
