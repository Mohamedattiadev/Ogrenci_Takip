import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  Users,
  UsersRound,
  CalendarRange,
  ClipboardCheck,
  FileBarChart,
  UserCog,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Ana panel navigasyonu - PLAN.md'deki v1 sayfa listesiyle birebir. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Genel Bakış', href: '/dashboard', icon: LayoutGrid },
  { label: 'Öğrenciler', href: '/dashboard/students', icon: Users },
  { label: 'Gruplar', href: '/dashboard/groups', icon: UsersRound },
  { label: 'Ders Programı', href: '/dashboard/schedule', icon: CalendarRange },
  { label: 'Yoklama', href: '/dashboard/attendance', icon: ClipboardCheck },
  { label: 'Raporlar', href: '/dashboard/reports', icon: FileBarChart },
  { label: 'Kullanıcılar', href: '/dashboard/users', icon: UserCog },
  { label: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
];
