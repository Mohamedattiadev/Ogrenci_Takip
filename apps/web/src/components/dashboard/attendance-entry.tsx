'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { SelectField } from '@/components/ui/select-field';
import { Button } from '@/components/ui/button';
import { type Page } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useManageAccess } from '@/lib/form';

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  course: { name: string };
  group: { name: string };
  attendanceLocked: boolean;
  attendanceTaken: boolean;
  isCancelled: boolean;
}

/**
 * Tarih + ders secimi: asil yoklama ekrani (checkbox + yorum, bkz. SessionAttendanceForm)
 * her zaman /dashboard/attendance/[sessionId] sayfasinda - burada sadece o oturuma
 * ulasmanin en hizli yolu sunuluyor (bugunku dersler disinda gecmis/baska bir gun icin de).
 */
export function AttendanceEntry() {
  const { user } = useManageAccess();
  const router = useRouter();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()),
  );
  const [sessionId, setSessionId] = useState('');
  const sessions = useApi<Page<Session>>('sessions', {
    from: date,
    to: date,
    pageSize: 100,
    ...(user?.role === 'TEACHER' ? { teacherId: user.id } : {}),
  });
  // Sunucu saati acilma anini belirler; ders baslayinca buton kendiliginden acilsin diye.
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
          onClick={() => selected && router.push(`/dashboard/attendance/${selected.id}`)}
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
    </section>
  );
}
