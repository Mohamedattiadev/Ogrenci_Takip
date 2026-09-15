'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiJson, buildUrl, type Query } from './api';

interface Result<T> {
  url: string | null;
  version: number;
  data: T | null;
  error: string | null;
}

/**
 * GET istegi + yukleniyor/hata durumu. `path` null ise istek atilmaz.
 * Sorgu degisince onceki veri yenisi gelene kadar ekranda kalir (tablo zipplamasin).
 */
export function useApi<T>(path: string | null, query?: Query) {
  const url = path ? buildUrl(path, query) : null;
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T>>({
    url: null,
    version: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    apiJson<T>(url)
      .then((data) => {
        if (!cancelled) setResult({ url, version, data, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.';
        setResult((previous) => ({ url, version, data: previous.data, error: message }));
      });
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  const loading = url !== null && (result.url !== url || result.version !== version);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data: result.data, error: loading ? null : result.error, loading, reload };
}
