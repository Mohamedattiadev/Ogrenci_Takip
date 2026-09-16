import type { UserRole } from './session';

/** API yanit tipleri (docs/api/openapi.json ile uyumlu, panelin kullandigi alanlar). */
export interface Ref {
  id: string;
  name: string | null;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' | 'ABSENT_EXCUSED';

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
  startDate: string | null;
  endDate: string | null;
  breaks: { startDate: string; endDate: string }[];
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
  note: string | null;
  student: { id: string; fullName: string; studentNumber: string };
  session: { id: string; date: string; startTime: string };
  group: { id: string; name: string };
  course: { id: string; name: string };
}

/** GET /sessions/:id/attendance - oturumdaki tum ogrenciler + mevcut isaretlemeler. */
export interface SessionRoster {
  session: {
    id: string;
    date: string;
    dayName: string;
    startTime: string;
    endTime: string;
    classroom: string | null;
    isCancelled: boolean;
    cancelReason: string | null;
    isMakeup: boolean;
    attendanceTaken: boolean;
    attendanceLocked: boolean;
    attendanceOpensAt: string;
    group: { id: string; name: string };
    course: { id: string; name: string };
    teacher: Ref | null;
    institution: Ref | null;
  };
  summary: {
    total: number;
    counts: Record<AttendanceStatus, number>;
    attendanceRate: number | null;
    rosterSize: number;
    unmarked: number;
  };
  students: {
    student: {
      id: string;
      studentNumber: string;
      firstName: string;
      lastName: string;
      fullName: string;
    };
    record: {
      id: string;
      status: AttendanceStatus;
      statusLabel: string;
      note: string | null;
      markedAt: string;
      markedBy: Ref | null;
      updatedAt: string;
      updatedBy: Ref | null;
    } | null;
  }[];
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
      session: {
        id: string;
        isCancelled: boolean;
        attendanceTaken: boolean;
        attendanceLocked: boolean;
        attendanceOpensAt: string;
      } | null;
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
