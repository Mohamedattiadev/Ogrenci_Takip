import type { UserRole } from './session';

/** API yanit tipleri (docs/api/openapi.json ile uyumlu, panelin kullandigi alanlar). */
export interface Ref {
  id: string;
  name: string | null;
}

export type AttendanceStatus =
  'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' | 'ABSENT_EXCUSED' | 'ABSENT_UNEXCUSED';

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  institution: Ref | null;
  scholarshipProgram: { id: string; code: string; name: string } | null;
  guardian: { name: string | null; phone: string | null; email: string | null };
  groups: { id: string; name: string }[];
  status: 'ACTIVE' | 'WITHDRAWN';
  phone?: string | null;
  /** Ogrenci giris hesabi (yalnizca yoneticiler gorur). */
  account?: { username: string | null; isActive: boolean; mustChangePassword: boolean } | null;
}

export interface Group {
  id: string;
  name: string;
  institution: Ref | null;
  term: { id: string; name: string };
  scholarshipProgram: { id: string; code: string; name: string } | null;
  activeStudentCount: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  institution: Ref | null;
}

export interface Schedule {
  id: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  classroom: string | null;
  group: { id: string; name: string };
  course: { id: string; name: string };
  teacher: Ref | null;
  institution: Ref | null;
}

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  statusLabel: string;
  student: { id: string; fullName: string; studentNumber: string };
  session: { id: string; date: string; startTime: string };
  group: { id: string; name: string };
  course: { id: string; name: string };
}

export interface Dashboard {
  date: string;
  stats: {
    activeStudents: number;
    activeTeachers: number;
    activeGroups: number;
    todaysLessons: number;
    attendanceRateLast30Days: number | null;
    missingAttendanceLast30Days: number;
  };
  today: {
    dayName: string;
    holidays: { id: string; description: string }[];
    lessons: {
      scheduleId: string;
      startTime: string;
      group: { name: string };
      course: { name: string };
      teacher: Ref | null;
      session: { isCancelled: boolean; attendanceTaken: boolean } | null;
    }[];
  };
  recentActivity: { type: 'student' | 'attendance'; text: string; at: string; entityId: string }[];
}

export interface Me {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  institution: Ref | null;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  gender: 'FEMALE' | 'MALE' | null;
  activeStudentCount: number;
  groupCount: number;
}

export function formatDateTr(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return date.toLocaleDateString('tr-TR', { timeZone: 'UTC' });
}
