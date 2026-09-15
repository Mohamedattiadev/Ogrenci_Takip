'use client';

import { AlertTriangle } from 'lucide-react';
import { StatStrip } from '@/components/dashboard/stat-strip';
import type { PortalAttendance } from '@/lib/portal-types';
import { formatDateTr } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import {
  Badge,
  Card,
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  STATUS_TONE,
  Table,
  Td,
  rateText,
} from './ui';

export function MyAttendance() {
  const { data, error } = useApi<PortalAttendance>('portal/attendance');
  const counts = data?.summary.counts;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Yoklamam"
        description="Hangi derslere katılıp katılmadığınız ve devam durumunuz"
      />
      <ErrorNote message={error} />

      {data?.alert.reached ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Habersiz devamsızlığınız {data.alert.unexcusedAbsences} oldu (sınır{' '}
            {data.alert.threshold}).
          </p>
        </div>
      ) : null}

      <StatStrip
        items={[
          { label: 'Devam Oranı', value: rateText(data?.summary.attendanceRate), tone: 'success' },
          {
            label: 'Geldi / Geç',
            value: counts ? `${counts.PRESENT} / ${counts.LATE}` : '…',
            tone: 'brand',
          },
          {
            label: 'İzinli / Haberli',
            value: counts ? `${counts.EXCUSED} / ${counts.ABSENT_EXCUSED}` : '…',
            tone: 'accent',
          },
          {
            label: 'Gelmedi / Habersiz',
            value: counts ? `${counts.ABSENT} / ${counts.ABSENT_UNEXCUSED}` : '…',
            tone: 'warning',
          },
        ]}
      />

      <Card title="Ders Bazlı Devam">
        {!data ? (
          <Loading />
        ) : data.courses.length === 0 ? (
          <Empty>Henüz yoklama kaydınız yok.</Empty>
        ) : (
          <Table head={['Ders', 'Geldi', 'Geç', 'İzinli', 'Devamsız', 'Devam Oranı']}>
            {data.courses.map((c) => (
              <tr key={c.course.id}>
                <Td className="font-medium text-neutral-800 dark:text-neutral-100">
                  {c.course.name}
                </Td>
                <Td>{c.counts.PRESENT}</Td>
                <Td>{c.counts.LATE}</Td>
                <Td>{c.counts.EXCUSED}</Td>
                <Td>{c.counts.ABSENT + c.counts.ABSENT_EXCUSED + c.counts.ABSENT_UNEXCUSED}</Td>
                <Td className="font-semibold">{rateText(c.attendanceRate)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Yoklama Kayıtları">
        {!data ? (
          <Loading />
        ) : data.records.length === 0 ? (
          <Empty>Henüz yoklama kaydınız yok.</Empty>
        ) : (
          <Table head={['Tarih', 'Ders', 'Hoca', 'Durum', 'Not']}>
            {data.records.map((r) => (
              <tr key={r.id}>
                <Td className="[font-variant-numeric:tabular-nums]">
                  {formatDateTr(r.date)} {r.startTime}
                  {r.isMakeup ? ' · telafi' : ''}
                </Td>
                <Td className="font-medium text-neutral-800 dark:text-neutral-100">
                  {r.course.name}
                </Td>
                <Td>{r.teacher?.name ?? '—'}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[r.status]}>{r.statusLabel}</Badge>
                </Td>
                <Td>{r.note ?? ''}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
