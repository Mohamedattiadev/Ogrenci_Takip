'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson, ApiError } from '@/lib/api';
import {
  DAY_OPTIONS,
  compact,
  useManageAccess,
  useOptions,
  type Option,
  type TeacherAssignmentOption,
} from '@/lib/form';
import type { Group, Institution, User, Schedule } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

export function ScheduleForm({
  schedule,
  onClose,
  onCreated,
}: {
  schedule?: Schedule;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user, isSuperAdmin } = useManageAccess();
  const [form, setForm] = useState({
    institutionId: schedule?.institution?.id ?? '',
    groupId: schedule?.group.id ?? '',
    courseId: schedule?.course.id ?? '',
    teacherId: schedule?.teacher?.id ?? '',
    dayOfWeek: schedule ? String(schedule.dayOfWeek) : '',
    startTime: schedule?.startTime ?? '18:00',
    endTime: schedule?.endTime ?? '19:30',
    classroom: schedule?.classroom ?? '',
    startDate: schedule?.startDate ?? '',
    endDate: schedule?.endDate ?? '',
  });
  const [breaks, setBreaks] = useState(schedule?.breaks ?? []);
  const set =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const institutionId = isSuperAdmin ? form.institutionId : (user?.institutionId ?? '');
  const institutions = useOptions<Institution>(isSuperAdmin ? 'institutions' : null, {
    isActive: true,
  });
  const groups = useOptions<Group>(institutionId ? 'groups' : null, { institutionId });
  const courses = useOptions<Option>(institutionId ? 'courses' : null, { institutionId });
  const group = groups.items.find((g) => g.id === form.groupId);
  const programId = group?.scholarshipProgram?.id;

  // Burs programli grupta sadece o yurt+programa gorevlendirilmis hocalar ders verebilir.
  const assignments = useOptions<TeacherAssignmentOption>(
    group && programId ? 'teacher-assignments' : null,
    { institutionId, scholarshipProgramId: programId, isActive: true },
  );
  const homeTeachers = useOptions<User>(group && !programId ? 'users' : null, {
    institutionId,
    role: 'TEACHER',
    isActive: true,
  });
  const teacherOptions = programId
    ? assignments.items
        .filter((a) => a.teacher)
        .map((a) => ({ value: a.teacher!.id, label: a.teacher!.name ?? 'Hoca' }))
    : homeTeachers.items.map((t) => ({ value: t.id, label: t.fullName }));
  const teachersLoading = assignments.loading || homeTeachers.loading;

  async function submit() {
    if (form.endDate < form.startDate)
      throw new ApiError('Bitiş tarihi başlangıçtan önce olamaz.', 400);
    if (
      breaks.some(
        (b) => b.startDate < form.startDate || b.endDate > form.endDate || b.startDate > b.endDate,
      )
    )
      throw new ApiError('Ara tatil aralıkları ders tarihleri içinde olmalı.', 400);
    await apiJson(schedule ? `schedules/${schedule.id}` : 'schedules', {
      method: schedule ? 'PATCH' : 'POST',
      body: compact({
        groupId: schedule ? undefined : form.groupId,
        startDate: form.startDate,
        endDate: form.endDate,
        breaks,
        courseId: form.courseId,
        teacherId: form.teacherId,
        dayOfWeek: form.dayOfWeek === '' ? undefined : Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        classroom: form.classroom,
      }),
    });
    onCreated();
  }

  return (
    <FormShell
      title={schedule ? 'Ders Programını Düzenle' : 'Yeni Ders Programı'}
      description="Seçtiğiniz gün, başlangıç ve bitiş tarihleri arasında her hafta tekrar eder. Ara tatillerde ders yapılmaz. * Zorunludur."
      submitLabel={schedule ? 'Değişiklikleri Kaydet' : 'Programa Ekle'}
      onClose={onClose}
      onSubmit={submit}
    >
      {isSuperAdmin ? (
        <FullWidth>
          <SelectField
            id="schedule-institution"
            label="Yurt *"
            disabled={!!schedule}
            value={form.institutionId}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                institutionId: event.target.value,
                groupId: '',
                courseId: '',
                teacherId: '',
              }))
            }
            options={institutions.items.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={institutions.loading ? 'Yükleniyor…' : 'Yurt seçin'}
            required
          />
        </FullWidth>
      ) : null}
      <SelectField
        id="schedule-group"
        label="Grup *"
        value={form.groupId}
        onChange={(event) =>
          setForm((previous) => ({ ...previous, groupId: event.target.value, teacherId: '' }))
        }
        options={groups.items.map((g) => ({
          value: g.id,
          label: `${g.name}${g.scholarshipProgram ? '' : ' (karma)'}`,
        }))}
        placeholder={institutionId ? 'Grup seçin' : 'Önce yurt seçin'}
        disabled={!institutionId || !!schedule}
        required
      />
      <SelectField
        id="schedule-course"
        label="Ders *"
        value={form.courseId}
        onChange={set('courseId')}
        options={courses.items.map((c) => ({ value: c.id, label: c.name }))}
        placeholder={institutionId ? 'Ders seçin' : 'Önce yurt seçin'}
        disabled={!institutionId}
        hint={
          institutionId && !courses.loading && courses.items.length === 0
            ? 'Bu yurtta tanımlı ders yok.'
            : undefined
        }
        required
      />
      <FullWidth>
        <SelectField
          id="schedule-teacher"
          label="Öğretmen *"
          value={form.teacherId}
          onChange={set('teacherId')}
          options={teacherOptions}
          placeholder={
            !group ? 'Önce grup seçin' : teachersLoading ? 'Yükleniyor…' : 'Öğretmen seçin'
          }
          disabled={!group}
          hint={
            group && !teachersLoading && teacherOptions.length === 0
              ? programId
                ? 'Bu yurt ve burs programına görevlendirilmiş öğretmen yok. Görevlendirmeyi sistem yöneticisi yapar.'
                : 'Bu yurda bağlı öğretmen yok.'
              : programId
                ? 'Yalnızca bu yurt ve burs programına görevlendirilmiş öğretmenler listelenir.'
                : undefined
          }
          required
        />
      </FullWidth>
      <SelectField
        id="schedule-day"
        label="Gün *"
        value={form.dayOfWeek}
        onChange={set('dayOfWeek')}
        options={DAY_OPTIONS}
        placeholder="Gün seçin"
        required
      />
      <Field
        id="schedule-classroom"
        label="Derslik"
        value={form.classroom}
        onChange={set('classroom')}
        maxLength={50}
        placeholder="ör. A-101"
      />
      <Field
        id="schedule-start"
        label="Başlangıç saati *"
        type="time"
        value={form.startTime}
        onChange={set('startTime')}
        required
      />
      <Field
        id="schedule-end"
        label="Bitiş saati *"
        type="time"
        value={form.endTime}
        onChange={set('endTime')}
        required
      />
      <Field
        id="schedule-start-date"
        label="Başlangıç tarihi *"
        type="date"
        value={form.startDate}
        max={form.endDate || undefined}
        onChange={set('startDate')}
        required
      />
      <Field
        id="schedule-end-date"
        label="Bitiş tarihi *"
        type="date"
        value={form.endDate}
        min={form.startDate || undefined}
        onChange={set('endDate')}
        required
      />
      <FullWidth>
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <h3 className="font-semibold">Ara tatil aralıkları</h3>
          <p className="text-sm text-neutral-500">
            İsteğe bağlı. Başlangıç ve bitiş günleri tatile dahildir.
          </p>
          {breaks.map((range, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-2">
              <Field
                id={`break-start-${index}`}
                label="Tatil başlangıcı *"
                type="date"
                required
                min={form.startDate}
                max={range.endDate || form.endDate}
                value={range.startDate}
                onChange={(e) =>
                  setBreaks((items) =>
                    items.map((b, i) => (i === index ? { ...b, startDate: e.target.value } : b)),
                  )
                }
              />
              <Field
                id={`break-end-${index}`}
                label="Tatil bitişi *"
                type="date"
                required
                min={range.startDate || form.startDate}
                max={form.endDate}
                value={range.endDate}
                onChange={(e) =>
                  setBreaks((items) =>
                    items.map((b, i) => (i === index ? { ...b, endDate: e.target.value } : b)),
                  )
                }
              />
              <button
                type="button"
                className="text-left text-sm text-red-600"
                onClick={() => setBreaks((items) => items.filter((_, i) => i !== index))}
              >
                Bu aralığı kaldır
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold text-brand-700 disabled:opacity-40"
            disabled={!form.startDate || !form.endDate || breaks.length >= 50}
            onClick={() => setBreaks((items) => [...items, { startDate: '', endDate: '' }])}
          >
            + Ara tatil ekle
          </button>
        </div>
      </FullWidth>
    </FormShell>
  );
}
