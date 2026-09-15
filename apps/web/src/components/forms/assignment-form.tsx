'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import { useOptions } from '@/lib/form';
import type { Schedule } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

/** Yeni odev: hoca sadece kendi derslerini, yurt yoneticisi yurdunun derslerini gorur (RLS). */
export function AssignmentForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    scheduleId: '',
    title: '',
    description: '',
    dueAt: '',
    allowText: true,
    allowFile: true,
  });
  const set =
    (key: 'scheduleId' | 'title' | 'dueAt') =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));
  const schedules = useOptions<Schedule>('schedules');

  async function submit() {
    if (!form.allowText && !form.allowFile) {
      throw new Error('Metin veya PDF cevaplarından en az biri seçilmeli.');
    }
    await apiJson('assignments', {
      method: 'POST',
      body: {
        scheduleId: form.scheduleId,
        title: form.title.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        ...(form.dueAt ? { dueAt: new Date(form.dueAt).toISOString() } : {}),
        allowText: form.allowText,
        allowFile: form.allowFile,
      },
    });
    onCreated();
  }

  return (
    <FormShell
      title="Yeni Ödev"
      description="Ödev seçilen dersin grubundaki öğrencilere anında görünür."
      submitLabel="Ödevi Yayınla"
      onClose={onClose}
      onSubmit={submit}
    >
      <FullWidth>
        <SelectField
          id="hw-schedule"
          label="Ders *"
          value={form.scheduleId}
          onChange={set('scheduleId')}
          options={schedules.items.map((s) => ({
            value: s.id,
            label: `${s.course.name} · ${s.group.name} · ${s.dayName} ${s.startTime}${s.teacher?.name ? ` · ${s.teacher.name}` : ''}`,
          }))}
          placeholder={schedules.loading ? 'Yükleniyor…' : 'Ders seçin'}
          required
        />
      </FullWidth>
      <FullWidth>
        <Field
          id="hw-title"
          label="Başlık *"
          value={form.title}
          onChange={set('title')}
          required
          minLength={2}
          maxLength={200}
        />
      </FullWidth>
      <FullWidth>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Açıklama
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={5}
            maxLength={5000}
            placeholder="Öğrencilerden ne istediğinizi yazın…"
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm font-normal text-neutral-800 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-brand-900/40"
          />
        </label>
      </FullWidth>
      <Field
        id="hw-due"
        label="Son teslim"
        type="datetime-local"
        value={form.dueAt}
        onChange={set('dueAt')}
      />
      <div className="flex flex-col gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-medium">Kabul edilen cevap</span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.allowText}
            onChange={(e) => setForm((p) => ({ ...p, allowText: e.target.checked }))}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800"
          />
          Metin cevap
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.allowFile}
            onChange={(e) => setForm((p) => ({ ...p, allowFile: e.target.checked }))}
            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800"
          />
          PDF dosyası (en fazla 10 MB)
        </label>
      </div>
    </FormShell>
  );
}
