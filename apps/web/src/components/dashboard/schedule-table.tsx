'use client';

import { useState } from 'react';
import { CalendarDays, List, Plus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { ScheduleForm } from '@/components/forms/schedule-form';
import { WeeklyTimetable } from '@/components/schedule/weekly-timetable';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import type { Page } from '@/lib/api';
import { useManageAccess, useOptions } from '@/lib/form';
import type { Group, Schedule } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { usePagedList } from '@/lib/use-paged-list';
import { cn } from '@/lib/utils';

const columns: DataTableColumn<Schedule>[] = [
  {
    key: 'group',
    label: 'Grup',
    sortable: true,
    sortValue: (r) => r.group.name,
    render: (r) => (
      <span className="font-medium text-neutral-800 dark:text-neutral-100">{r.group.name}</span>
    ),
  },
  {
    key: 'course',
    label: 'Ders',
    sortable: true,
    sortValue: (r) => r.course.name,
    render: (r) => r.course.name,
  },
  {
    key: 'teacher',
    label: 'Öğretmen',
    sortable: true,
    sortValue: (r) => r.teacher?.name ?? '',
    render: (r) => r.teacher?.name ?? '—',
  },
  { key: 'institution', label: 'Yurt', render: (r) => r.institution?.name ?? '—' },
  {
    key: 'day',
    label: 'Gün',
    sortable: true,
    sortValue: (r) => r.dayOfWeek * 10000 + Number(r.startTime.replace(':', '')),
    render: (r) => r.dayName,
  },
  {
    key: 'time',
    label: 'Saat',
    sortable: true,
    sortValue: (r) => r.startTime,
    render: (r) => (
      <span className="[font-variant-numeric:tabular-nums]">{`${r.startTime}–${r.endTime}`}</span>
    ),
  },
  { key: 'classroom', label: 'Derslik', render: (r) => r.classroom ?? '—' },
];

type View = 'week' | 'list';

export function ScheduleTable() {
  const list = usePagedList<Schedule>('schedules', {}, 50);
  const { canManage } = useManageAccess();
  const [view, setView] = useState<View>('week');
  const [creating, setCreating] = useState(false);
  // Yeni ders eklenince haftalik tablo da yeniden yuklensin.
  const [version, setVersion] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ViewSwitch view={view} onChange={setView} />
      </div>
      {view === 'week' ? (
        <WeeklySchedule key={version} onCreate={canManage ? () => setCreating(true) : undefined} />
      ) : (
        <DataTable
          title="Ders Programı"
          subtitle="Haftalık tekrar eden ders saatleri"
          columns={columns}
          rows={list.rows}
          getRowId={(r) => r.id}
          searchPlaceholder="Grup, ders, öğretmen veya derslik ara…"
          onSearchChange={list.onSearchChange}
          pagination={list.pagination}
          loading={list.loading}
          error={list.error}
          primaryActionLabel={canManage ? 'Yeni Ders Programı' : undefined}
          onPrimaryAction={() => setCreating(true)}
        />
      )}
      {creating ? (
        <ScheduleForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            list.reload();
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const options = [
    { value: 'week' as const, label: 'Haftalık tablo', icon: CalendarDays },
    { value: 'list' as const, label: 'Liste', icon: List },
  ];
  return (
    <div
      role="group"
      aria-label="Görünüm"
      className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            'focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:outline-none',
            view === value
              ? 'bg-brand-700 text-white'
              : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white',
          )}
        >
          <Icon size={15} strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Hoca kendi derslerini gorur (hucrede grup yazar). Yoneticiler bir grup secer (hucrede hoca
 * yazar); tum yurtlarin derslerini tek tabloya koymak okunmaz olurdu.
 */
function WeeklySchedule({ onCreate }: { onCreate?: () => void }) {
  const { user, isSuperAdmin } = useManageAccess();
  const isTeacher = user?.role === 'TEACHER';
  const groups = useOptions<Group>(user && !isTeacher ? 'groups' : null);
  const [groupId, setGroupId] = useState('');
  const selectedGroup = groupId || groups.items[0]?.id || '';

  const query = isTeacher
    ? { teacherId: user.id, pageSize: 100 }
    : selectedGroup
      ? { groupId: selectedGroup, pageSize: 100 }
      : null;
  const { data, error, loading } = useApi<Page<Schedule>>(
    user && query ? 'schedules' : null,
    query ?? undefined,
  );
  const lessons = data?.data ?? [];

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
            Ders Programı
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isTeacher ? 'Haftalık dersleriniz ve grupları' : 'Seçilen grubun haftalık dersleri'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {!isTeacher ? (
            <div className="w-72 max-w-full">
              <SelectField
                id="timetable-group"
                label="Grup"
                placeholder={groups.loading ? 'Yükleniyor…' : 'Grup seçin'}
                value={selectedGroup}
                onChange={(e) => setGroupId(e.target.value)}
                options={groups.items.map((g) => ({
                  value: g.id,
                  label:
                    isSuperAdmin && g.institution?.name
                      ? `${g.name} (${g.institution.name})`
                      : g.name,
                }))}
              />
            </div>
          ) : null}
          {onCreate ? (
            <Button type="button" onClick={onCreate}>
              <Plus size={16} />
              Yeni Ders Programı
            </Button>
          ) : null}
        </div>
      </div>

      {(error ?? groups.error) ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger dark:border-red-900/50 dark:bg-red-950/40"
        >
          {error ?? groups.error}
        </p>
      ) : null}

      {!isTeacher && !groups.loading && groups.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Henüz grup yok. Önce Gruplar sayfasından grup oluşturun.
        </p>
      ) : loading && !data ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Yükleniyor…
        </p>
      ) : data ? (
        <WeeklyTimetable
          lessons={lessons}
          detail={(lesson) => (isTeacher ? lesson.group.name : lesson.teacher?.name)}
          emptyLabel={isTeacher ? 'Size atanmış ders yok.' : 'Bu grubun ders programı boş.'}
        />
      ) : null}
    </section>
  );
}
