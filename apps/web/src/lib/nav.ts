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
  section: string;
}

/** Ana panel navigasyonu - PLAN.md'deki v1 sayfa listesiyle birebir. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Genel Bakış', href: '/dashboard', icon: LayoutGrid, section: 'Genel' },
  { label: 'Öğrenciler', href: '/dashboard/students', icon: Users, section: 'Eğitim' },
  { label: 'Gruplar', href: '/dashboard/groups', icon: UsersRound, section: 'Eğitim' },
  { label: 'Ders Programı', href: '/dashboard/schedule', icon: CalendarRange, section: 'Eğitim' },
  { label: 'Yoklama', href: '/dashboard/attendance', icon: ClipboardCheck, section: 'Eğitim' },
  { label: 'Raporlar', href: '/dashboard/reports', icon: FileBarChart, section: 'Yönetim' },
  { label: 'Kullanıcılar', href: '/dashboard/users', icon: UserCog, section: 'Yönetim' },
  { label: 'Ayarlar', href: '/dashboard/settings', icon: Settings, section: 'Yönetim' },
];

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
