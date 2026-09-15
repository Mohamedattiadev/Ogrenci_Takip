'use client';

import { useState, type ChangeEvent } from 'react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { apiJson } from '@/lib/api';
import {
  DAY_OPTIONS,
  compact,
  useManageAccess,
  useOptions,
  type Option,
  type TeacherAssignmentOption,
} from '@/lib/form';
import type { Group, Institution, User } from '@/lib/types';
import { FormShell, FullWidth } from './form-shell';

export function ScheduleForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user, isSuperAdmin } = useManageAccess();
  const [form, setForm] = useState({
    institutionId: '',
    groupId: '',
    courseId: '',
    teacherId: '',
    dayOfWeek: '',
    startTime: '18:00',
    endTime: '19:30',
    classroom: '',
  });
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
    await apiJson('schedules', {
      method: 'POST',
      body: compact({
        groupId: form.groupId,
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
      title="Yeni Ders Programı"
      description="Haftalık tekrar eden ders. Haftada iki ders için iki ayrı kayıt oluşturun."
      submitLabel="Programa Ekle"
      onClose={onClose}
      onSubmit={submit}
    >
      {isSuperAdmin ? (
        <FullWidth>
          <SelectField
            id="schedule-institution"
            label="Yurt *"
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
        disabled={!institutionId}
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
        label="Başlangıç *"
        type="time"
        value={form.startTime}
        onChange={set('startTime')}
        required
      />
      <Field
        id="schedule-end"
        label="Bitiş *"
        type="time"
        value={form.endTime}
        onChange={set('endTime')}
        required
      />
    </FormShell>
  );
}
