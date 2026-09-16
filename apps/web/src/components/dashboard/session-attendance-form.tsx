'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, Empty, ErrorNote, Loading, Table, Td } from '@/components/portal/ui';
import { ApiError, apiJson } from '@/lib/api';
import { formatDateTr, type AttendanceStatus, type SessionRoster } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Hocanin isaretleyebilecegi tek durum kumesi - sirali, checkbox olarak gosterilir. */
const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Geldi' },
  { value: 'ABSENT', label: 'Gelmedi' },
  { value: 'EXCUSED', label: 'İzinli' },
  { value: 'LATE', label: 'Geç Geldi' },
  { value: 'ABSENT_EXCUSED', label: 'Haberli Devamsız' },
];

type RosterRecord = SessionRoster['students'][number]['record'];

/** alan olmamasi = sunucu degerini kullan; `status: null` = kullanici bilerek isareti kaldirdi. */
interface Override {
  status?: AttendanceStatus | null;
  note?: string;
}

const CHECKBOX =
  'h-4 w-4 rounded border-neutral-300 accent-brand-600 dark:border-neutral-600 dark:bg-neutral-800';
const NOTE_INPUT =
  'w-full min-w-[160px] rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-700 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:ring-brand-900/40';

/**
 * Oturum bazli yoklama girisi: her ogrenci icin bes durumdan biri checkbox ile secilir
 * (dropdown yerine, kagit yoklama cetveline benzesin diye) ve sagda serbest metin bir
 * yorum girilebilir. Yorum admin tarafindan Yoklama listesinde ve raporlarda gorunur.
 * Yerel duzenlemeler sunucu kaydiyla degil sadece kullanici degistirdiginde eslesir
 * (override haritasi), boylece veri gelisi formu ezmez.
 */
export function SessionAttendanceForm() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { data, error, reload } = useApi<SessionRoster>(`sessions/${sessionId}/attendance`);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function statusOf(studentId: string, record: RosterRecord): AttendanceStatus | null {
    const override = overrides[studentId]?.status;
    return override !== undefined ? override : (record?.status ?? null);
  }

  function noteOf(studentId: string, record: RosterRecord): string {
    const override = overrides[studentId]?.note;
    return override !== undefined ? override : (record?.note ?? '');
  }

  function toggleStatus(
    studentId: string,
    status: AttendanceStatus,
    current: AttendanceStatus | null,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: current === status ? null : status },
    }));
  }

  function setNote(studentId: string, note: string) {
    setOverrides((prev) => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
  }

  const markedEntries = (data?.students ?? [])
    .map(({ student, record }) => ({
      studentId: student.id,
      status: statusOf(student.id, record),
      note: noteOf(student.id, record).trim(),
    }))
    .filter(
      (e): e is { studentId: string; status: AttendanceStatus; note: string } => e.status !== null,
    )
    .map((e) => ({ ...e, note: e.note === '' ? null : e.note }));

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await apiJson(`sessions/${sessionId}/attendance`, {
        method: 'PUT',
        body: { entries: markedEntries },
      });
      setOverrides({});
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Yoklama kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Geri dön
      </button>
      <ErrorNote message={error ?? saveError} />
      {!data ? (
        error ? null : (
          <Loading />
        )
      ) : (
        <>
          <Card>
            <div>
              <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                {data.session.course.name} · {data.session.group.name}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatDateTr(data.session.date)} · {data.session.startTime}-{data.session.endTime}
                {data.session.classroom ? ` · ${data.session.classroom}` : ''}
                {data.session.teacher?.name ? ` · ${data.session.teacher.name}` : ''}
                {data.session.isMakeup ? ' · telafi' : ''}
              </p>
            </div>
          </Card>

          <Card
            title="Yoklama"
            action={
              <button
                type="button"
                onClick={() => void save()}
                disabled={
                  saving ||
                  data.session.isCancelled ||
                  data.session.attendanceLocked ||
                  markedEntries.length === 0
                }
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            }
          >
            {data.session.isCancelled ? (
              <Empty>Bu ders iptal edildi; yoklama girilemez.</Empty>
            ) : data.session.attendanceLocked ? (
              <Empty>
                Ders başlamadan yoklama alınamaz. Yoklama{' '}
                {new Date(data.session.attendanceOpensAt).toLocaleString('tr-TR', {
                  timeZone: 'Europe/Istanbul',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                itibarıyla açılacak.
              </Empty>
            ) : data.students.length === 0 ? (
              <Empty>Bu grupta kayıtlı öğrenci yok.</Empty>
            ) : (
              <Table head={['Öğrenci', ...STATUS_OPTIONS.map((o) => o.label), 'Yorum']}>
                {data.students.map(({ student, record }) => {
                  const status = statusOf(student.id, record);
                  const note = noteOf(student.id, record);
                  return (
                    <tr key={student.id}>
                      <Td className="font-medium text-neutral-800 dark:text-neutral-100">
                        {student.fullName}
                        <span className="block text-xs font-normal text-neutral-400">
                          {student.studentNumber}
                        </span>
                      </Td>
                      {STATUS_OPTIONS.map((option) => (
                        <Td key={option.value} className="text-center">
                          <input
                            type="checkbox"
                            aria-label={`${student.fullName} - ${option.label}`}
                            checked={status === option.value}
                            onChange={() => toggleStatus(student.id, option.value, status)}
                            className={CHECKBOX}
                          />
                        </Td>
                      ))}
                      <Td>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(student.id, e.target.value)}
                          placeholder="Yorum ekle…"
                          maxLength={300}
                          className={NOTE_INPUT}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
