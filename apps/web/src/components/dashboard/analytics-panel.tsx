'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  GraduationCap,
  Layers,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { DataTable, type DataTableColumn } from './data-table';
import { useApi } from '@/lib/use-api';
import { useSessionUser } from '@/lib/session';
import type { Page } from '@/lib/api';
import type { Analytics, AnalyticsCategory, AnalyticsDetail } from '@/lib/analytics-types';
import { formatDateTr } from '@/lib/types';
import { cn } from '@/lib/utils';

const CARD =
  'rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900';
const INTERACTIVE =
  'cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:hover:bg-white/5';
const TONES: Record<AnalyticsCategory, { fill: string; dot: string }> = {
  attended: { fill: 'var(--color-status-present)', dot: 'bg-status-present' },
  absent: { fill: 'var(--color-status-absentExcused)', dot: 'bg-status-absentExcused' },
  excused: { fill: 'var(--color-accent-500)', dot: 'bg-accent-500' },
  // "Yoklama kaydı yok" bir hata rengi değil; marka paletindeki sakin lacivert tonuyla
  // gösterilir. Böylece koyu temada açık gri/beyaz bir halka oluşmaz.
  unrecorded: { fill: 'var(--color-brand-500)', dot: 'bg-brand-500' },
};
const number = new Intl.NumberFormat('tr-TR');
const rate = (value: number | null | undefined) =>
  value == null ? '—' : `%${number.format(value)}`;
function addDate(value: string, amount: number) {
  const d = new Date(`${value}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
function initialWeek() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(
    new Date(),
  );
  const day = new Date(`${today}T00:00:00Z`);
  return addDate(today, -((day.getUTCDay() + 6) % 7));
}
interface Selection {
  title: string;
  category?: AnalyticsCategory | 'all';
  date?: string;
  groupId?: string;
}

export function AnalyticsPanel() {
  const user = useSessionUser();
  const personal = user?.role === 'STUDENT';
  const [from, setFrom] = useState(initialWeek);
  const [to, setTo] = useState(() => addDate(initialWeek(), 6));
  const [selection, setSelection] = useState<Selection | null>(null);
  const valid = Boolean(
    from && to && from <= to && new Date(to).getTime() - new Date(from).getTime() <= 30 * 86400000,
  );
  const { data, loading, error, reload } = useApi<Analytics>(
    user && valid ? 'dashboard/analytics' : null,
    { from, to },
  );
  const ready = valid && !loading && !error ? data : null;
  const shift = (amount: number) => {
    setFrom(addDate(from, amount));
    setTo(addDate(to, amount));
    setSelection(null);
  };
  const cards = ready
    ? [
        {
          title: 'Aktif Öğrenci',
          value: ready.counts.students,
          icon: Users,
          hint: 'Öğrencileri incele',
          action: () => setSelection({ title: 'Aktif öğrenciler' }),
        },
        {
          title: 'Ders Veren Öğretmen',
          value: ready.counts.teachers,
          icon: GraduationCap,
          hint: 'Aktif ders programlarında',
        },
        {
          title: 'Gruplar',
          value: ready.counts.groups,
          icon: Layers,
          hint: 'Aşağıda öğrenci dağılımı',
        },
        {
          title: 'Bugünkü Dersler',
          value: ready.counts.todayLessons,
          icon: CalendarDays,
          hint: 'Kayıtlı, iptal edilmemiş dersler',
        },
      ]
    : [];
  return (
    <section className="space-y-5" aria-label="Devam istatistikleri">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">
            {personal ? 'Kişisel istatistikler' : 'Genel bakış'}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {personal ? 'Derse katılımım' : 'Öğrencileriniz bir bakışta'}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {personal
              ? 'Yalnızca size ait yoklama kayıtları.'
              : user?.role === 'TEACHER'
                ? 'Kendi öğrencileriniz ve verdiğiniz derslerin yoklamaları.'
                : user?.role === 'INSTITUTION_ADMIN'
                  ? 'Yurdunuzun öğrencileri ve devam durumu.'
                  : 'Yetkiniz kapsamındaki tüm yurtların öğrenci ve devam durumu.'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={reload}
          disabled={loading || !valid}
          aria-label="İstatistikleri yenile"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin motion-reduce:animate-none' : ''}
          />{' '}
          Yenile
        </Button>
      </div>
      {!personal ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {ready
            ? cards.map(({ title, value, icon: Icon, hint, action }) => {
                const content = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        {title}
                      </span>
                      <Icon className="shrink-0 text-brand-600 dark:text-brand-300" size={19} />
                    </div>
                    <p className="my-2 font-display text-3xl font-bold tabular-nums text-neutral-900 dark:text-white">
                      {number.format(value)}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {hint}
                      {action ? <ArrowUpRight size={13} /> : null}
                    </p>
                  </>
                );
                return action ? (
                  <button
                    key={title}
                    onClick={action}
                    className={cn(CARD, INTERACTIVE, 'text-left')}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={title} className={CARD}>
                    {content}
                  </div>
                );
              })
            : [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(CARD, 'h-32 animate-pulse motion-reduce:animate-none')}
                  aria-hidden="true"
                >
                  <div className="h-3 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ))}
        </div>
      ) : null}
      <div className={cn(CARD, 'flex flex-wrap items-end gap-3 !py-3')}>
        <div className="mr-auto pb-1">
          <p className="text-sm font-semibold">İstatistik dönemi</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tarihleri değiştirerek karşılaştırın.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            variant="ghost"
            aria-label="Önceki hafta"
            disabled={!valid}
            onClick={() => shift(-7)}
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="w-36">
            <Field
              id="analytics-from"
              label="Başlangıç"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setSelection(null);
              }}
            />
          </div>
          <div className="w-36">
            <Field
              id="analytics-to"
              label="Bitiş"
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                setTo(e.target.value);
                setSelection(null);
              }}
            />
          </div>
          <Button
            variant="ghost"
            aria-label="Sonraki hafta"
            disabled={!valid}
            onClick={() => shift(7)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      {!valid || error ? (
        <p
          role="alert"
          className="rounded-xl bg-status-absentUnexcusedBg p-4 text-sm text-status-danger dark:bg-status-danger/10"
        >
          {!valid ? 'En fazla 31 günlük, geçerli bir tarih aralığı seçin.' : error}
        </p>
      ) : null}
      {loading && valid ? (
        <p role="status" className="py-8 text-center text-sm text-neutral-500">
          İstatistikler yükleniyor…
        </p>
      ) : null}
      {ready ? (
        <>
          <div className="grid min-w-0 gap-5 xl:grid-cols-[1.35fr_1fr]">
            <div className={CARD}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold">Günlük Katılım Oranı</h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Geldi ve geç geldi / girilmiş tüm yoklamalar
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                  Ortalama {rate(ready.attendanceRate)}
                </span>
              </div>
              <div className="mt-7 flex gap-3">
                <div
                  aria-hidden="true"
                  className="flex h-48 shrink-0 flex-col justify-between pb-0 text-[10px] text-neutral-500 dark:text-neutral-400"
                >
                  {['100%', '75%', '50%', '25%', '0%'].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto pb-2">
                  <div
                    className="relative flex h-60 gap-2"
                    style={{ minWidth: ready.days.length > 7 ? ready.days.length * 44 : undefined }}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 flex h-48 flex-col justify-between"
                    >
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="border-t border-dashed border-neutral-200 dark:border-neutral-800"
                        />
                      ))}
                    </div>
                    {ready.days.map((day) => (
                      <button
                        key={day.date}
                        disabled={!day.total}
                        onClick={() =>
                          setSelection({
                            title: `${formatDateTr(day.date)} · Katılım`,
                            date: day.date,
                            category: 'attended',
                          })
                        }
                        aria-label={`${formatDateTr(day.date)} katılım ${rate(day.rate)}, ${day.total} yoklama kaydı. Ayrıntıları göster.`}
                        title={`${formatDateTr(day.date)} · ${day.total ? `${rate(day.rate)} katılım · Ayrıntıları göster` : 'Yoklama kaydı yok'}`}
                        className={cn(
                          'z-10 flex min-w-0 flex-1 flex-col rounded-md px-1 text-center disabled:cursor-default',
                          INTERACTIVE,
                        )}
                      >
                        <div className="relative flex h-48 w-full items-end justify-center">
                          {day.rate !== null ? (
                            <div
                              className="relative w-full max-w-10 rounded-t-md bg-status-present/90"
                              style={{ height: `${Math.max(day.rate, 1)}%` }}
                            >
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                                {rate(day.rate)}
                              </span>
                            </div>
                          ) : (
                            <span className="pb-1 text-neutral-400">—</span>
                          )}
                        </div>
                        <span className="mt-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          {new Intl.DateTimeFormat('tr', {
                            weekday: 'short',
                            timeZone: 'UTC',
                          }).format(new Date(day.date))}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {day.date.slice(8)}.{day.date.slice(5, 7)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {ready.totalRecords
                  ? 'Bir güne tıklayarak katılım ayrıntılarını açın.'
                  : 'Bu dönemde henüz yoklama kaydı yok. Veri olmayan günler sıfır kabul edilmez.'}
              </p>
            </div>
            <div className={CARD}>
              <h3 className="font-display font-bold">
                {personal ? 'Devam Durumum' : 'Öğrencilerin Devam Durumu'}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {personal
                  ? `${ready.totalRecords} yoklama kaydı üzerinden`
                  : `${ready.counts.students} aktif öğrenci üzerinden · Kişi bazında`}
              </p>
              <Donut
                data={ready}
                onSelect={(segment) =>
                  setSelection({ title: segment.label, category: segment.key })
                }
              />
              <div className="space-y-1">
                {ready.distribution.map((segment) => (
                  <button
                    key={segment.key}
                    onClick={() => setSelection({ title: segment.label, category: segment.key })}
                    className={cn(
                      INTERACTIVE,
                      'flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm',
                    )}
                  >
                    <span
                      className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TONES[segment.key].dot)}
                    />
                    <span className="flex-1">{segment.label}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {number.format(segment.count)} {personal ? 'kayıt' : 'öğrenci'}
                    </span>
                    <strong className="w-14 text-right tabular-nums">
                      {rate(segment.percent)}
                    </strong>
                    <ArrowUpRight size={14} className="text-neutral-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {!personal ? (
            <div className="flex items-start gap-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
              <Info size={15} className="mt-0.5 shrink-0" />
              <p>
                Her öğrenci tek kategoride sayılır: önce en az bir devamsızlığı olanlar, sonra
                devamsızlığı olmayıp izin kaydı olanlar, sonra tüm kayıtlarında katılanlar. Yoklama
                kaydı olmayanlar ayrıca gösterilir. Geç gelenler katılıma dahildir.
              </p>
            </div>
          ) : null}
          {!personal ? (
            <div className={CARD}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold">Gruplara Göre Öğrenci Sayısı</h3>
                <span className="text-xs text-neutral-500">Aktif üyelikler</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Bir gruba tıklayarak öğrencilerini inceleyin. Bir öğrenci birden fazla grupta yer
                alabilir.
              </p>
              <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {ready.groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelection({ title: group.name, groupId: group.id })}
                    className={cn(
                      INTERACTIVE,
                      'rounded-xl border border-neutral-100 p-3 text-left dark:border-neutral-800',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words">{group.name}</span>
                      <strong className="shrink-0 text-brand-700 dark:text-brand-300">
                        {number.format(group.count)}{' '}
                        <span className="text-xs font-normal">öğrenci</span>
                      </strong>
                    </div>
                    <div className="h-1.5 rounded-full bg-brand-50 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                        style={{
                          width: `${(group.count / Math.max(1, ...ready.groups.map((g) => g.count))) * 100}%`,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
              {!ready.groups.length ? (
                <p className="py-4 text-sm text-neutral-500">Görüntülenecek grup yok.</p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {selection && ready ? (
        <DetailModal
          key={`${from}-${to}-${selection.category}-${selection.date}-${selection.groupId}`}
          selection={selection}
          from={from}
          to={to}
          personal={personal}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}

function Donut({
  data,
  onSelect,
}: {
  data: Analytics;
  onSelect: (segment: Analytics['distribution'][number]) => void;
}) {
  const total = data.distribution.reduce((n, s) => n + s.count, 0);
  const segments = data.distribution.filter((segment) => segment.count > 0);
  return (
    <div className="relative mx-auto my-3 h-48 w-48">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90 text-brand-100 dark:text-brand-800"
        aria-label="Devam dağılımı; ayrıntılar aşağıdaki düğmelerde"
      >
        <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="13" />
        {segments.map((segment, index) => {
          const length = (segment.count / total) * 100;
          const start = segments
            .slice(0, index)
            .reduce((sum, item) => sum + (item.count / total) * 100, 0);
          return (
            <circle
              key={segment.key}
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke={TONES[segment.key].fill}
              strokeWidth="13"
              pathLength="100"
              strokeDasharray={`${Math.max(0, length - (length === 100 ? 0 : 0.8))} ${100 - length + (length === 100 ? 0 : 0.8)}`}
              strokeDashoffset={-start}
              onClick={() => onSelect(segment)}
              className="cursor-pointer transition-opacity hover:opacity-75"
            >
              <title>
                {segment.label}: {segment.count} ({rate(segment.percent)})
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="font-display text-3xl font-bold tabular-nums">
          {number.format(total)}
        </strong>
        <span className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {data.personal ? 'yoklama kaydı' : 'öğrenci'}
        </span>
      </div>
    </div>
  );
}
function DetailModal({
  selection,
  from,
  to,
  personal,
  onClose,
}: {
  selection: Selection;
  from: string;
  to: string;
  personal: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, loading, error } = useApi<Page<AnalyticsDetail>>('dashboard/analytics/details', {
    from,
    to,
    category: selection.category ?? 'all',
    date: selection.date,
    groupId: selection.groupId,
    page,
    pageSize: 20,
    search,
  });
  const columns: DataTableColumn<AnalyticsDetail>[] = personal
    ? [
        { key: 'date', label: 'Tarih', render: (r) => `${formatDateTr(r.date!)} ${r.time}` },
        { key: 'name', label: 'Ders', render: (r) => r.name },
        { key: 'status', label: 'Durum', render: (r) => r.status },
      ]
    : [
        {
          key: 'name',
          label: 'Öğrenci',
          render: (r) => (
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-neutral-500">
                {r.studentNumber} · {r.institution}
              </p>
            </div>
          ),
        },
        { key: 'groups', label: 'Grup', render: (r) => r.groups?.join(', ') || 'Grupsuz' },
        { key: 'attended', label: 'Katılım', render: (r) => r.attended },
        { key: 'absent', label: 'Devamsız', render: (r) => r.absent },
        { key: 'excused', label: 'İzinli', render: (r) => r.excused },
        { key: 'rate', label: 'Oran', render: (r) => rate(r.rate) },
      ];
  return (
    <Modal
      title={selection.title}
      description={`${formatDateTr(selection.date ?? from)} – ${formatDateTr(selection.date ?? to)} · ${personal ? 'Kendi yoklama kayıtlarınız' : 'Sayılar öğrencinin seçilen dönemdeki yoklama kayıtlarıdır.'}`}
      onClose={onClose}
    >
      <div className="min-h-0 overflow-y-auto p-4">
        <DataTable
          title={personal ? 'Yoklama ayrıntıları' : 'Öğrenci listesi'}
          columns={columns}
          rows={loading || error ? [] : (data?.data ?? [])}
          getRowId={(r) => r.id}
          loading={loading}
          error={error}
          emptyLabel="Bu seçimde kayıt bulunmuyor."
          searchPlaceholder={personal ? 'Ders ara…' : 'Öğrenci adı veya numarası…'}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          pagination={data ? { ...data.meta, onPageChange: setPage } : undefined}
        />
      </div>
    </Modal>
  );
}
