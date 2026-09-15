export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    role: string;
    institutionId: string | null;
    fullName?: string;
    email?: string;
  };
}

/** Liste uc noktalarinin ortak yaniti. */
export interface Page<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>;

const KEYS = ['accessToken', 'refreshToken', 'user'] as const;

export async function login(email: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı, lütfen tekrar deneyin.', 0);
  }
  if (!res.ok) {
    if (res.status === 401) throw new ApiError('E-posta veya şifre hatalı.', 401);
    if (res.status === 429)
      throw new ApiError('Çok fazla deneme yapıldı, bir dakika bekleyin.', 429);
    throw new ApiError('Sunucuya ulaşılamadı, lütfen tekrar deneyin.', res.status);
  }
  return res.json();
}

/** "Beni hatirla" secildiyse localStorage, degilse sessionStorage kullanilir. */
function activeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (window.localStorage.getItem('refreshToken')) return window.localStorage;
  if (window.sessionStorage.getItem('refreshToken')) return window.sessionStorage;
  return null;
}

export function hasSession(): boolean {
  return activeStorage() !== null;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of KEYS) storage.removeItem(key);
  }
}

let refreshing: Promise<boolean> | null = null;

/** Erisim jetonu suresi dolunca bir kez yenilenir; ayni anda gelen istekler tek yenilemeyi paylasir. */
function refreshTokens(): Promise<boolean> {
  const storage = activeStorage();
  const refreshToken = storage?.getItem('refreshToken');
  if (!storage || !refreshToken) return Promise.resolve(false);
  refreshing ??= fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as LoginResponse;
      storage.setItem('accessToken', body.accessToken);
      storage.setItem('refreshToken', body.refreshToken);
      storage.setItem('user', JSON.stringify(body.user));
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(
    path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`,
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
}

export async function apiFetch(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<Response> {
  const token = activeStorage()?.getItem('accessToken');
  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Sunucuya ulaşılamadı. API çalışıyor mu?', 0);
  }
  if (res.status === 401 && retry && (await refreshTokens())) return apiFetch(path, options, false);
  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.assign('/login');
  }
  if (!res.ok) {
    let message = 'İstek başarısız oldu.';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // JSON olmayan hata govdesi: varsayilan mesaj kalir.
    }
    throw new ApiError(message, res.status);
  }
  return res;
}

export async function apiJson<T>(path: string, options?: RequestOptions): Promise<T> {
  const res = await apiFetch(path, options);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Rapor/disa aktarma dosyasini indirir; dosya adi API'nin Content-Disposition basligindan alinir. */
export async function downloadFile(path: string, query?: Query) {
  const res = await apiFetch(path, { query });
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const encoded = /filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/.exec(disposition)?.[1];
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = encoded ? decodeURIComponent(encoded) : (plain ?? 'dosya');
  link.click();
  URL.revokeObjectURL(url);
}

export async function logout() {
  const refreshToken = activeStorage()?.getItem('refreshToken');
  clearSession();
  if (!refreshToken) return;
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
}
