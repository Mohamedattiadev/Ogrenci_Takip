'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import {
  compact,
  todayIso,
  useManageAccess,
  useOptions,
  YEAR_OPTIONS,
  type ScholarshipProgramOption,
} from '@/lib/form';
import type { Group, Institution, Student } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Kız' },
  { value: 'MALE', label: 'Erkek' },
];

export function StudentForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user, isSuperAdmin } = useManageAccess();
  const [form, setForm] = useState({
    institutionId: '',
    studentNumber: '',
    firstName: '',
    lastName: '',
    gender: '',
    scholarshipProgramId: '',
    university: '',
    department: '',
    universityYear: '',
    phone: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    enrollDate: todayIso(),
    groupId: '',
  });
  const set =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const institutionId = isSuperAdmin ? form.institutionId : (user?.institutionId ?? '');
  const institutions = useOptions<Institution>('institutions', { isActive: true });
  const programs = useOptions<ScholarshipProgramOption>('scholarship-programs', { isActive: true });
  const groups = useOptions<Group>(institutionId ? 'groups' : null, {
    institutionId,
    scholarshipProgramId: form.scholarshipProgramId || undefined,
  });
  const dormGender = institutions.items.find((i) => i.id === institutionId)?.gender ?? null;
  const gender = dormGender ?? form.gender;

  async function submit() {
    const student = await apiJson<Student>('students', {
      method: 'POST',
      body: compact({
        institutionId: isSuperAdmin ? institutionId : undefined,
        studentNumber: form.studentNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        gender,
        scholarshipProgramId: form.scholarshipProgramId,
        university: form.university,
        department: form.department,
        universityYear: form.universityYear === '' ? undefined : Number(form.universityYear),
        phone: form.phone,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianEmail: form.guardianEmail,
        enrollDate: form.enrollDate,
      }),
    });
    onCreated();
    if (!form.groupId) return;
    const result = await apiJson<{ added: number; skipped: { reason: string }[] }>(
      `groups/${form.groupId}/members`,
      { method: 'POST', body: { studentIds: [student.id], effectiveFrom: form.enrollDate } },
    );
    onCreated();
    if (result.added === 0) {
      return `Öğrenci kaydedildi ancak gruba eklenemedi: ${result.skipped[0]?.reason ?? 'bilinmeyen neden'}`;
    }
  }

  return (
    <FormShell
      title="Yeni Öğrenci"
      description="Yurt, burs programı ve iletişim bilgileriyle öğrenci kaydı"
      submitLabel="Öğrenciyi Kaydet"
      onClose={onClose}
      onSubmit={submit}
    >
      <FullWidth>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          * işaretli alanlar zorunludur.
        </p>
      </FullWidth>
      {isSuperAdmin ? (
        <FullWidth>
          <SelectField
            id="student-institution"
            label="Yurt *"
            value={form.institutionId}
            onChange={set('institutionId')}
            options={institutions.items.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={institutions.loading ? 'Yükleniyor…' : 'Yurt seçin'}
            required
          />
        </FullWidth>
      ) : null}
      <Field
        id="student-number"
        label="Öğrenci No *"
        value={form.studentNumber}
        onChange={set('studentNumber')}
        required
        maxLength={30}
      />
      <Field
        id="student-enroll"
        label="Kayıt Tarihi *"
        type="date"
        value={form.enrollDate}
        onChange={set('enrollDate')}
        required
      />
      <Field
        id="student-first"
        label="Ad *"
        value={form.firstName}
        onChange={set('firstName')}
        required
        maxLength={60}
      />
      <Field
        id="student-last"
        label="Soyad *"
        value={form.lastName}
        onChange={set('lastName')}
        required
        maxLength={60}
      />
      <SelectField
        id="student-gender"
        label={dormGender ? 'Cinsiyet' : 'Cinsiyet'}
        value={gender}
        onChange={set('gender')}
        options={GENDER_OPTIONS}
        disabled={Boolean(dormGender)}
        hint={dormGender ? 'Yurdun cinsiyetine göre otomatik' : undefined}
      />
      <SelectField
        id="student-program"
        label="Burs Programı"
        value={form.scholarshipProgramId}
        onChange={(event) =>
          setForm((previous) => ({
            ...previous,
            scholarshipProgramId: event.target.value,
            groupId: '',
          }))
        }
        options={programs.items.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Seçilmedi"
      />
      <Field
        id="student-university"
        label="Üniversite"
        value={form.university}
        onChange={set('university')}
        maxLength={120}
      />
      <Field
        id="student-department"
        label="Bölüm"
        value={form.department}
        onChange={set('department')}
        maxLength={120}
      />
      <SelectField
        id="student-year"
        label="Sınıf"
        value={form.universityYear}
        onChange={set('universityYear')}
        options={YEAR_OPTIONS}
        placeholder="Seçilmedi"
      />
      <Field
        id="student-phone"
        label="Telefon"
        type="tel"
        value={form.phone}
        onChange={set('phone')}
        placeholder="05xx xxx xx xx"
      />
      <Field
        id="student-guardian"
        label="Veli Adı"
        value={form.guardianName}
        onChange={set('guardianName')}
        maxLength={120}
      />
      <Field
        id="student-guardian-phone"
        label="Veli Telefon"
        type="tel"
        value={form.guardianPhone}
        onChange={set('guardianPhone')}
      />
      <FullWidth>
        <Field
          id="student-guardian-email"
          label="Veli E-posta"
          type="email"
          value={form.guardianEmail}
          onChange={set('guardianEmail')}
        />
      </FullWidth>
      <FullWidth>
        <SelectField
          id="student-group"
          label="Ders Grubu"
          value={form.groupId}
          onChange={set('groupId')}
          options={groups.items.map((g) => ({
            value: g.id,
            label: `${g.name} · ${g.term.name}`,
          }))}
          placeholder={institutionId ? 'Şimdilik gruba ekleme' : 'Önce yurt seçin'}
          disabled={!institutionId}
          hint="İsteğe bağlı. Burs programı seçildiyse yalnızca o programın grupları listelenir."
        />
      </FullWidth>
    </FormShell>
  );
}
