'use client';

import { useSessionUser } from './session';
import type { Page, Query } from './api';
import { useApi } from './use-api';

export interface Option {
  id: string;
  name: string;
}

export interface ScholarshipProgramOption {
  id: string;
  code: string;
  name: string;
}

export interface TermOption {
  id: string;
  name: string;
}

export interface TeacherAssignmentOption {
  id: string;
  teacher: { id: string; name: string | null } | null;
}

/** 0 = Pazartesi … 6 = Pazar (API ile ayni sira). */
export const DAY_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

export const DAY_OPTIONS = DAY_NAMES.map((label, index) => ({ value: String(index), label }));

/** 0 = Hazirlik … 6 = 6. sinif (Student.universityYear ile ayni). */
export const YEAR_OPTIONS = [
  { value: '0', label: 'Hazırlık' },
  ...[1, 2, 3, 4, 5, 6].map((year) => ({ value: String(year), label: `${year}. sınıf` })),
];

/** Bugunun tarihi (yerel saat) YYYY-AA-GG. */
export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Bos metinleri istekten cikarir (API bos degeri "girilmedi" olarak bekler). */
export function compact<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null,
    ),
  ) as Partial<T>;
}

/** Secim kutulari icin liste (en fazla 100 kayit). path null ise istek atilmaz. */
export function useOptions<T>(path: string | null, query?: Query) {
  const { data, loading, error } = useApi<Page<T>>(path, { pageSize: 100, ...query });
  return { items: data?.data ?? [], loading, error };
}

/** Giris yapan kullanicinin rolune gore yonetim yetkileri. */
export function useManageAccess() {
  const user = useSessionUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canManage = isSuperAdmin || user?.role === 'INSTITUTION_ADMIN';
  // Ogrenciyi baska gruba tasima: admin veya (yalnizca kendi ders verdigi ogrenciler icin) hoca.
  // Gercek sinir RLS'te; burada sadece dugmenin gorunurlugu belirleniyor.
  const canMoveGroup = canManage || user?.role === 'TEACHER';
  return { user, isSuperAdmin, canManage, canMoveGroup };
}
