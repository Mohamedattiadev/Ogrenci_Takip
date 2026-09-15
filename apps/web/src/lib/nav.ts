import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  LayoutGrid,
  NotebookPen,
  Settings,
  UserCog,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';

import { STAFF_ROLES, type UserRole } from './session';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: string;
  /** Tanimliysa sadece bu roller gorur ve sayfaya girebilir. */
  roles?: UserRole[];
}

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'INSTITUTION_ADMIN'];
const HOMEWORK_ROLES: UserRole[] = ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'TEACHER'];
const STUDENT_ONLY: UserRole[] = ['STUDENT'];

/** Panel navigasyonu. Menu ve sayfa erisimi (AuthGuard) bu listeden turetilir. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Genel Bakış', href: '/dashboard', icon: LayoutGrid, section: 'Genel' },
  // Ogrenci
  {
    label: 'Derslerim',
    href: '/dashboard/my-schedule',
    icon: CalendarDays,
    section: 'Öğrenim',
    roles: STUDENT_ONLY,
  },
  {
    label: 'Yoklamam',
    href: '/dashboard/my-attendance',
    icon: ClipboardCheck,
    section: 'Öğrenim',
    roles: STUDENT_ONLY,
  },
  {
    label: 'Ödevlerim',
    href: '/dashboard/my-assignments',
    icon: NotebookPen,
    section: 'Öğrenim',
    roles: STUDENT_ONLY,
  },
  {
    label: 'Profilim',
    href: '/dashboard/profile',
    icon: UserRound,
    section: 'Hesabım',
    roles: STUDENT_ONLY,
  },
  // Personel
  {
    label: 'Öğrenciler',
    href: '/dashboard/students',
    icon: Users,
    section: 'Eğitim',
    roles: STAFF_ROLES,
  },
  {
    label: 'Gruplar',
    href: '/dashboard/groups',
    icon: UsersRound,
    section: 'Eğitim',
    roles: STAFF_ROLES,
  },
  {
    label: 'Ders Programı',
    href: '/dashboard/schedule',
    icon: CalendarRange,
    section: 'Eğitim',
    roles: STAFF_ROLES,
  },
  {
    label: 'Yoklama',
    href: '/dashboard/attendance',
    icon: ClipboardCheck,
    section: 'Eğitim',
    roles: STAFF_ROLES,
  },
  {
    label: 'Ödevler',
    href: '/dashboard/assignments',
    icon: ClipboardList,
    section: 'Eğitim',
    roles: HOMEWORK_ROLES,
  },
  {
    label: 'Raporlar',
    href: '/dashboard/reports',
    icon: FileBarChart,
    section: 'Yönetim',
    roles: STAFF_ROLES,
  },
  {
    label: 'Kullanıcılar',
    href: '/dashboard/users',
    icon: UserCog,
    section: 'Yönetim',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Ayarlar',
    href: '/dashboard/settings',
    icon: Settings,
    section: 'Yönetim',
    roles: STAFF_ROLES,
  },
];

/** Rolun gorebilecegi menu ogeleri. Rol henuz bilinmiyorsa kisitli ogeler gizlenir. */
export function navItemsForRole(role: UserRole | null | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role ? item.roles.includes(role) : false));
}

/** Adrese karsilik gelen menu ogesi (alt sayfalar dahil, en uzun eslesen). */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

/** NAV_ITEMS'i sira korunarak section'lara gruplar (sidebar basliklari icin). */
export function groupNavBySection(items: NavItem[]): { section: string; items: NavItem[] }[] {
  const groups: { section: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const current = groups.at(-1);
    if (current && current.section === item.section) {
      current.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}
