'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { Download, KeyRound, LoaderCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { ApiError, apiJson, downloadFile } from '@/lib/api';
import type { PortalProfile } from '@/lib/portal-types';
import { formatDateTr } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { Card, ErrorNote, Loading, PageHeader } from './ui';

const YEAR_OPTIONS = [
  { value: '0', label: 'Hazırlık' },
  ...[1, 2, 3, 4, 5, 6].map((y) => ({ value: String(y), label: `${y}. sınıf` })),
];

export function ProfilePage() {
  const { data, error, reload } = useApi<PortalProfile>('portal/profile');

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Profilim"
        description="İletişim ve öğrenim bilgilerinizi güncel tutun. Kilitli bilgileri yurt yönetimi düzenler."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/change-password"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              <KeyRound size={15} /> Şifre değiştir
            </Link>
            <button
              type="button"
              onClick={() => void downloadFile('portal/export')}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              <Download size={15} /> Verilerimi indir
            </button>
          </div>
        }
      />
      <ErrorNote message={error} />
      {!data ? (
        error ? null : (
          <Loading />
        )
      ) : (
        <>
          <Card title="Kayıt Bilgileri">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Öğrenci No', data.studentNumber],
                ['Yurt', data.institution?.name ?? '—'],
                ['Burs Programı', data.scholarshipProgram?.name ?? '—'],
                ['Kayıt Tarihi', formatDateTr(data.enrollDate)],
                ['Gruplar', data.groups.map((g) => g.name).join(', ') || '—'],
                [
                  'Cinsiyet',
                  data.gender === 'FEMALE' ? 'Kız' : data.gender === 'MALE' ? 'Erkek' : '—',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-white/[0.03]"
                >
                  <p className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                    <Lock size={11} /> {label}
                  </p>
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">{value}</p>
                </div>
              ))}
            </div>
          </Card>
          <EditableProfile key={JSON.stringify(data)} profile={data} onSaved={reload} />
        </>
      )}
    </div>
  );
}

function EditableProfile({ profile, onSaved }: { profile: PortalProfile; onSaved: () => void }) {
  const [form, setForm] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? '',
    university: profile.university ?? '',
    department: profile.department ?? '',
    universityYear: profile.universityYear === null ? '' : String(profile.universityYear),
    guardianName: profile.guardian.name ?? '',
    guardianPhone: profile.guardian.phone ?? '',
    guardianEmail: profile.guardian.email ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
    try {
      await apiJson('portal/profile', {
        method: 'PATCH',
        body: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: orNull(form.phone),
          university: orNull(form.university),
          department: orNull(form.department),
          universityYear: form.universityYear === '' ? null : Number(form.universityYear),
          guardianName: orNull(form.guardianName),
          guardianPhone: orNull(form.guardianPhone),
          guardianEmail: orNull(form.guardianEmail),
        },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bilgiler kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Kişisel ve İletişim Bilgileri">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="p-first"
            label="Ad"
            value={form.firstName}
            onChange={set('firstName')}
            required
            minLength={2}
            maxLength={60}
          />
          <Field
            id="p-last"
            label="Soyad"
            value={form.lastName}
            onChange={set('lastName')}
            required
            minLength={2}
            maxLength={60}
          />
          <Field
            id="p-phone"
            label="Telefon"
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="05xx xxx xx xx"
          />
          <SelectField
            id="p-year"
            label="Sınıf"
            value={form.universityYear}
            onChange={set('universityYear')}
            options={YEAR_OPTIONS}
            placeholder="Seçilmedi"
          />
          <Field
            id="p-university"
            label="Üniversite"
            value={form.university}
            onChange={set('university')}
            maxLength={120}
          />
          <Field
            id="p-department"
            label="Bölüm"
            value={form.department}
            onChange={set('department')}
            maxLength={120}
          />
          <Field
            id="p-guardian"
            label="Veli Adı"
            value={form.guardianName}
            onChange={set('guardianName')}
            maxLength={120}
          />
          <Field
            id="p-guardian-phone"
            label="Veli Telefon"
            type="tel"
            value={form.guardianPhone}
            onChange={set('guardianPhone')}
          />
          <div className="sm:col-span-2">
            <Field
              id="p-guardian-email"
              label="Veli E-posta"
              type="email"
              value={form.guardianEmail}
              onChange={set('guardianEmail')}
            />
          </div>
        </div>
        <ErrorNote message={error} />
        {saved ? (
          <p className="text-sm font-medium text-status-present">Bilgileriniz kaydedildi.</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
            Kaydet
          </Button>
        </div>
      </form>
    </Card>
  );
}
