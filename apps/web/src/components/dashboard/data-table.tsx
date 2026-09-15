'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
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

export interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchPlaceholder: string;
  searchText: (row: T) => string;
  primaryActionLabel?: string;
  primaryActionIcon?: LucideIcon;
  sample?: boolean;
  emptyLabel?: string;
}

/**
 * Genel amacli veri tablosu: Ogrenciler/Gruplar/Kullanicilar gibi benzer
 * "arama + siralanabilir tablo + sayfalama" ekranlarinin tekrarini onlemek
 * icin Ders Programi tablosundan cikarilan ortak kalip.
 */
export function DataTable<T>({
  title,
  subtitle,
  columns,
  rows,
  getRowId,
  searchPlaceholder,
  searchText,
  primaryActionLabel,
  primaryActionIcon: PrimaryIcon = Plus,
  sample,
  emptyLabel = 'Kayıt bulunamadı.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) =>
      searchText(row).toLowerCase().includes(search.toLowerCase()),
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
  }, [rows, search, sortKey, sortDir, columns, searchText]);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
          ) : null}
        </div>
        {primaryActionLabel ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
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
            className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-800 dark:focus:ring-brand-900/40"
          />
        </div>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          Filtrele
        </button>
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          <Download size={15} strokeWidth={1.75} />
          Dışa Aktar
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-100 dark:border-neutral-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-white/[0.03]">
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
                        'flex items-center gap-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100',
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
                        <ChevronsUpDown
                          size={13}
                          strokeWidth={2}
                          className="text-neutral-300 dark:text-neutral-600"
                        />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                      {col.label}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-neutral-400 dark:text-neutral-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-neutral-50 dark:hover:bg-white/[0.03]">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 text-neutral-600 dark:text-neutral-300',
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
        <span className="text-neutral-400 dark:text-neutral-500">
          Toplam{' '}
          <strong className="font-semibold text-neutral-600 dark:text-neutral-300">
            {visibleRows.length}
          </strong>{' '}
          kayıt
          {sample ? (
            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 uppercase dark:bg-white/5 dark:text-neutral-500">
              Örnek veri
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-1">
          {['İlk', 'Önceki', 'Sonraki', 'Son'].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="cursor-not-allowed rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-300 dark:text-neutral-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
