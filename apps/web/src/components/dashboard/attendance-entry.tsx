'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { Button } from '@/components/ui/button';
import { FormShell } from '@/components/forms/form-shell';
import { apiJson, type Page } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useManageAccess } from '@/lib/form';
import { type AttendanceStatus } from '@/lib/types';

interface Session {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  course: { name: string };
  group: { name: string };
  attendanceLocked: boolean;
  attendanceTaken: boolean;
  isCancelled: boolean;
}
interface Roster {
  session: Session;
  students: {
    student: { id: string; fullName: string; studentNumber: string };
    record: { status: AttendanceStatus; note: string | null } | null;
  }[];
}
const options = [
  { value: 'PRESENT', label: 'Geldi' },
  { value: 'LATE', label: 'Geç geldi' },
  { value: 'ABSENT_UNEXCUSED', label: 'Mazeretsiz gelmedi' },
  { value: 'ABSENT_EXCUSED', label: 'Mazeretli gelmedi' },
  { value: 'EXCUSED', label: 'İzinli' },
  { value: 'ABSENT', label: 'Gelmedi' },
];
export function AttendanceEntry({ onSaved }: { onSaved: () => void }) {
  const { user } = useManageAccess();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()),
  );
  const [sessionId, setSessionId] = useState('');
  const [opened, setOpened] = useState<string | null>(null);
  const sessions = useApi<Page<Session>>('sessions', {
    from: date,
    to: date,
    pageSize: 100,
    ...(user?.role === 'TEACHER' ? { teacherId: user.id } : {}),
  });
  // Server time decides availability; refresh so the button opens when the lesson starts.
  useEffect(() => {
    const timer = setInterval(sessions.reload, 15000);
    return () => clearInterval(timer);
  }, [sessions.reload]);
  const selected = sessions.data?.data.find((s) => s.id === sessionId);
  if (!user || !['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'TEACHER'].includes(user.role)) return null;
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <h2 className="text-xl font-semibold">Yoklama Al</h2>
        <p className="text-sm text-neutral-500">
          Önce kayıtlı dersi seçin. Yoklama, dersin başlangıç saatinde açılır (Türkiye saati).
        </p>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-[180px_1fr_auto]">
        <Field
          id="attendance-date"
          label="Ders tarihi"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSessionId('');
          }}
        />
        <SelectField
          id="attendance-session"
          label="Ders"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder={sessions.loading ? 'Yükleniyor…' : 'Ders seçin'}
          disabled={sessions.loading || !!sessions.error}
          options={(sessions.data?.data ?? []).map((s) => ({
            value: s.id,
            label: `${s.startTime}–${s.endTime} · ${s.course.name} · ${s.group.name}${s.isCancelled ? ' · İptal' : s.attendanceLocked ? ' · Kilitli' : s.attendanceTaken ? ' · Yoklama alındı' : ''}`,
          }))}
        />
        <Button
          disabled={!selected || selected.attendanceLocked || sessions.loading || !!sessions.error}
          onClick={() => selected && setOpened(selected.id)}
        >
          {selected?.attendanceLocked ? <LockKeyhole size={16} /> : null}
          {selected?.attendanceTaken ? 'Yoklamayı Düzenle' : 'Yoklama Al'}
        </Button>
      </div>
      {sessions.error ? (
        <p role="alert" className="text-red-600">
          {sessions.error}
        </p>
      ) : null}
      {!sessions.loading && !sessions.error && !sessions.data?.data.length ? (
        <p className="text-sm text-neutral-500">Bu tarihte kayıtlı ders bulunmuyor.</p>
      ) : null}
      {selected?.attendanceLocked ? (
        <p className="text-sm text-neutral-500">
          {selected.isCancelled
            ? 'Bu ders iptal edilmiş.'
            : 'Bu ders için yoklama şu anda kilitli. Ders başlamadan giriş yapılamaz.'}
        </p>
      ) : null}
      {opened ? (
        <AttendanceRoster
          key={opened}
          id={opened}
          onClose={() => setOpened(null)}
          onSaved={() => {
            sessions.reload();
            onSaved();
          }}
        />
      ) : null}
    </section>
  );
}
function AttendanceRoster({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, loading, error } = useApi<Roster>(`sessions/${id}/attendance`);
  const [changes, setChanges] = useState<Record<string, AttendanceStatus>>({});
  return (
    <FormShell
      title="Ders Yoklaması"
      description={
        data
          ? `${data.session.course.name} · ${data.session.group.name} · ${data.session.date} ${data.session.startTime}`
          : 'Öğrenciler yükleniyor…'
      }
      submitLabel="Yoklamayı Kaydet"
      onClose={onClose}
      onSubmit={async () => {
        if (!data || loading || error || data.session.attendanceLocked)
          return 'Yoklama şu anda kaydedilemiyor. Ekranı kapatıp tekrar açın.';
        const entries = data.students.map(({ student, record }) => ({
          studentId: student.id,
          status: changes[student.id] ?? record?.status,
        }));
        if (entries.some((e) => !e.status)) return 'Lütfen tüm öğrenciler için durum seçin.';
        await apiJson(`sessions/${id}/attendance`, { method: 'PUT', body: { entries } });
        onSaved();
      }}
    >
      <div className="space-y-3 sm:col-span-2">
        {error ? <p role="alert">{error}</p> : loading ? <p>Yükleniyor…</p> : null}
        {data && !data.students.length ? <p>Bu derse kayıtlı öğrenci yok.</p> : null}
        <fieldset
          disabled={loading || !!error || !data || data.session.attendanceLocked}
          className="space-y-3"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setChanges(
                Object.fromEntries((data?.students ?? []).map((s) => [s.student.id, 'PRESENT'])),
              )
            }
          >
            Herkes geldi
          </Button>
          {data?.students.map(({ student, record }) => (
            <SelectField
              key={student.id}
              id={`attendance-${student.id}`}
              label={`${student.fullName} · ${student.studentNumber}`}
              value={changes[student.id] ?? record?.status ?? ''}
              options={options}
              placeholder="Durum seçin"
              required
              onChange={(e) =>
                setChanges((previous) => ({
                  ...previous,
                  [student.id]: e.target.value as AttendanceStatus,
                }))
              }
            />
          ))}
        </fieldset>
      </div>
    </FormShell>
  );
}
