import { useSyncExternalStore } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'TEACHER' | 'GROUP_LEADER' | 'STUDENT';

export interface SessionUser {
  id: string;
  role: UserRole;
  institutionId: string | null;
  fullName?: string;
  email?: string | null;
  username?: string | null;
  studentId?: string | null;
  /** Gecici sifreyle girildi: sifre degisene kadar panel kullanilamaz. */
  mustChangePassword?: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Sistem Yöneticisi',
  INSTITUTION_ADMIN: 'Kurum Yöneticisi',
  TEACHER: 'Öğretmen',
  GROUP_LEADER: 'Grup Sorumlusu',
  STUDENT: 'Öğrenci',
};

export const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'INSTITUTION_ADMIN',
  'TEACHER',
  'GROUP_LEADER',
];

const SESSION_EVENT = 'session-change';

/** Ayni sekmede oturum degisti (giris, sifre degisimi, jeton yenileme, cikis). */
export function notifySessionChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
}

/** localStorage/sessionStorage'dan giris yapan kullaniciyi okur - yoksa null. */
export function readSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('user') ?? window.sessionStorage.getItem('user');
  if (!raw) return null;
  return safeParseUser(raw);
}

// useSyncExternalStore icin: ayni ham deger icin ayni referansi dondurmemiz
// gerekir (Object.is ile karsilastiriliyor), yoksa sonsuz render dongusune
// girer. Bu yuzden JSON.parse sonucunu ham string'e gore onbelleklemek sart.
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
  // 'storage' baska sekmedeki degisiklikleri, SESSION_EVENT ayni sekmedekileri bildirir.
  window.addEventListener('storage', callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
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
 * (localStorage sunucuda yok), istemcide hydration sonrasi gercek degere gecer.
 */
export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
