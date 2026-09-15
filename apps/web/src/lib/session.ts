import { useSyncExternalStore } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'TEACHER' | 'GROUP_LEADER';

export interface SessionUser {
  id: string;
  role: UserRole;
  institutionId: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  INSTITUTION_ADMIN: 'Kurum Yöneticisi',
  TEACHER: 'Öğretmen',
  GROUP_LEADER: 'Grup Sorumlusu',
};

/** localStorage/sessionStorage'dan giris yapan kullaniciyi okur - yoksa null. */
export function readSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('user') ?? window.sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

// useSyncExternalStore icin: ayni ham deger icin ayni referansi dondurmemiz
// gerekir (Object.is ile karsilastiriliyor), yoksa sonsuz render dongusune
// girer. Bu yuzden JSON.parse sonucunu ham string'e gore onbelleklemek
// sart - her cagride yeni bir obje uretmek yanlis olurdu.
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

function getSnapshot(): SessionUser | null {
  const raw = window.localStorage.getItem('user') ?? window.sessionStorage.getItem('user');
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = raw ? safeParseUser(raw) : null;
  }
  return cachedUser;
}

function getServerSnapshot(): SessionUser | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  // Not: 'storage' olayi sadece BASKA bir sekme/pencerede degisiklik oldugunda
  // tetiklenir (ayni sekmede tetiklenmez) - bu, farkli bir sekmede cikis
  // yapilirsa bu sekmenin de haberdar olmasini saglayan bir bonus, gereklilik degil.
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function safeParseUser(raw: string): SessionUser | null {
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Giris yapan kullaniciyi (varsa) verir. Sunucuda her zaman null dondurur
 * (localStorage sunucuda yok), istemcide hydration sonrasi gercek degere
 * gecer - bu yuzden ilk render'da kisa bir an "Kullanici" gorulebilir.
 */
export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
