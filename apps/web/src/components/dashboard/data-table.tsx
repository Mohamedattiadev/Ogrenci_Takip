'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  LoaderCircle,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchPlaceholder: string;
  /** Istemci tarafi arama (onSearchChange verilmediyse kullanilir). */
  searchText?: (row: T) => string;
  /** Sunucu tarafi arama: yazma bittikten 300 ms sonra cagrilir. */
  onSearchChange?: (value: string) => void;
  pagination?: DataTablePagination;
  loading?: boolean;
  error?: string | null;
  primaryActionLabel?: string;
  primaryActionIcon?: LucideIcon;
  onPrimaryAction?: () => void;
  onExport?: () => void;
  sample?: boolean;
  emptyLabel?: string;
}

/**
 * Genel amacli veri tablosu: Ogrenciler/Gruplar/Kullanicilar gibi benzer
 * "arama + siralanabilir tablo + sayfalama" ekranlarinin tekrarini onler.
 * Sunucudan sayfali veri geldiginde arama ve sayfalama API'ye devredilir;
 * siralama o sayfadaki satirlar uzerinde yapilir.
 */
export function DataTable<T>({
  title,
  subtitle,
  columns,
  rows,
  getRowId,
  searchPlaceholder,
  searchText,
  onSearchChange,
  pagination,
  loading,
  error,
  primaryActionLabel,
  primaryActionIcon: PrimaryIcon = Plus,
  onPrimaryAction,
  onExport,
  sample,
  emptyLabel = 'Kayıt bulunamadı.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const searchCallback = useRef(onSearchChange);
  const firstRender = useRef(true);

  useEffect(() => {
    searchCallback.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => searchCallback.current?.(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const visibleRows = useMemo(() => {
    const filtered =
      onSearchChange || !searchText
        ? rows
        : rows.filter((row) =>
            searchText(row).toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')),
          );
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const valueOf =
      col.sortValue ?? ((row: T) => String((row as Record<string, unknown>)[col.key] ?? ''));
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'tr');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir, columns, searchText, onSearchChange]);

  const total = pagination?.total ?? visibleRows.length;
  const page = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const pageButtons: { label: string; target: number; disabled: boolean }[] = [
    { label: 'İlk', target: 1, disabled: page <= 1 },
    { label: 'Önceki', target: page - 1, disabled: page <= 1 },
    { label: 'Sonraki', target: page + 1, disabled: page >= totalPages },
    { label: 'Son', target: totalPages, disabled: page >= totalPages },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-neutral-900">{title}</h2>
          {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
        </div>
        {primaryActionLabel ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={!onPrimaryAction}
            title={onPrimaryAction ? undefined : 'Yakında kullanıma açılacak'}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            <PrimaryIcon size={16} strokeWidth={2} />
            {primaryActionLabel}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <Download size={15} strokeWidth={1.75} />
            Dışa Aktar
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-status-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="relative overflow-x-auto rounded-lg border border-neutral-100">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
            <LoaderCircle size={20} className="animate-spin text-brand-700" />
          </div>
        ) : null}
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-2.5', col.align === 'right' && 'text-right')}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'flex items-center gap-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase hover:text-neutral-800',
                        col.align === 'right' && 'ml-auto',
                      )}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp size={13} strokeWidth={2} />
                        ) : (
                          <ChevronDown size={13} strokeWidth={2} />
                        )
                      ) : (
                        <ChevronsUpDown size={13} strokeWidth={2} className="text-neutral-300" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-neutral-400"
                >
                  {loading ? 'Yükleniyor…' : emptyLabel}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-neutral-50">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 text-neutral-600',
                        col.align === 'right' && 'text-right [font-variant-numeric:tabular-nums]',
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
        <span className="text-neutral-400">
          Toplam <strong className="font-semibold text-neutral-600">{total}</strong> kayıt
          {pagination && totalPages > 1 ? (
            <span className="ml-2">
              · Sayfa {page}/{totalPages}
            </span>
          ) : null}
          {sample ? (
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase">
              Örnek veri
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-1">
          {pageButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              disabled={!pagination || button.disabled || loading}
              onClick={() => pagination?.onPageChange(button.target)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent"
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
