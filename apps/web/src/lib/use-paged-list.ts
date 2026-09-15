'use client';

import { useCallback, useState } from 'react';
import type { Page, Query } from './api';
import { useApi } from './use-api';

/** Sunucu tarafi arama + sayfalama yapan listeler icin ortak durum. */
export function usePagedList<T>(path: string, filters: Query = {}, pageSize = 25) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useApi<Page<T>>(path, {
    ...filters,
    page,
    pageSize,
    search,
  });
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  return {
    rows: data?.data ?? [],
    loading,
    error,
    reload,
    search,
    onSearchChange,
    pagination: data
      ? { page, totalPages: data.meta.totalPages, total: data.meta.total, onPageChange: setPage }
      : undefined,
  };
}
