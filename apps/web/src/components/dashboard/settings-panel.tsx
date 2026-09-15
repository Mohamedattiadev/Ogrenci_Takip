'use client';

import { useState } from 'react';
import { Building2, Download } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { ApiError, downloadFile, type Query } from '@/lib/api';
import type { Institution, Me } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div>
          <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Egitim yili Eylul'de baslar: Eylul oncesiyse bir onceki yilin Eylul'u. */
function academicYearStart(today: Date) {
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-09-01`;
}

export function SettingsPanel() {
  const me = useApi<Me>('auth/me');
  const institutionId = me.data?.institution?.id ?? null;
  const institution = useApi<Institution>(institutionId ? `institutions/${institutionId}` : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const exports: { label: string; path: string; query: Query }[] = [
    {
      label: 'Öğrenciler (Excel)',
      path: 'students/export',
      query: { format: 'excel', status: 'all' },
    },
    { label: 'Öğrenciler (CSV)', path: 'students/export', query: { format: 'csv', status: 'all' } },
    {
      label: 'Yoklama Özeti (CSV)',
      path: 'reports/student-attendance',
      query: {
        format: 'csv',
        from: academicYearStart(today),
        to: today.toISOString().slice(0, 10),
      },
    },
  ];

  async function runExport(item: (typeof exports)[number]) {
    setError(null);
    setBusy(item.label);
    try {
      await downloadFile(item.path, item.query);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Dosya indirilemedi.');
    } finally {
      setBusy(null);
    }
  }

  const inst = institution.data;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">Ayarlar</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Kurum bilgileri, yedekleme ve veri yönetimi.
        </p>
      </div>

      {error || me.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
        >
          {error ?? me.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SettingsSection
          icon={Building2}
          title="Kurum Bilgileri"
          description={
            me.data && !institutionId
              ? 'Sistem yöneticisi hesabı bir yurda bağlı değil.'
              : 'Bağlı olduğunuz yurt. Değişiklikleri sistem yöneticisi yapar.'
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="inst-name"
              label="Kurum Adı"
              value={inst?.name ?? (me.loading || institution.loading ? '…' : '—')}
              readOnly
            />
            <Field id="inst-code" label="Kurum Kodu" value={inst?.code ?? '—'} readOnly />
            <Field
              id="inst-students"
              label="Aktif Öğrenci"
              value={inst ? String(inst.activeStudentCount) : '—'}
              readOnly
            />
            <Field
              id="inst-groups"
              label="Grup"
              value={inst ? String(inst.groupCount) : '—'}
              readOnly
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Download}
          title="Veri Dışa Aktarma"
          description="Yetkinizdeki verileri indirilebilir dosya olarak alın"
        >
          <div className="flex flex-wrap gap-2">
            {exports.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void runExport(item)}
                className="rounded-lg border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
              >
                {busy === item.label ? 'Hazırlanıyor…' : item.label}
              </button>
            ))}
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
