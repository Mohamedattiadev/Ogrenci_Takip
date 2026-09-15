import type { AttendanceStatus, Ref } from './types';

/** Ogrenci paneli ve odev ekranlarinin API yanit tipleri. */

export interface Named {
  id: string;
  name: string;
}

export type StatusCounts = Record<AttendanceStatus, number>;

export interface AttendanceSummary {
  total: number;
  counts: StatusCounts;
  attendanceRate: number | null;
}

export interface PortalProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: 'FEMALE' | 'MALE' | null;
  phone: string | null;
  university: string | null;
  department: string | null;
  universityYear: number | null;
  guardian: { name: string | null; phone: string | null; email: string | null };
  enrollDate: string;
  institution: Ref | null;
  scholarshipProgram: { id: string; code: string; name: string } | null;
  groups: { id: string; name: string; term: Named; since: string }[];
  editableFields: string[];
}

export interface PortalLesson {
  id: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  classroom: string | null;
  group: Named;
  course: Named;
  teacher: Ref | null;
}

export interface PortalSchedule {
  lessons: PortalLesson[];
  courses: { course: Named; teachers: string[]; groups: string[]; weeklyLessons: number }[];
  upcoming: {
    id: string;
    date: string;
    dayName: string;
    startTime: string;
    endTime: string;
    classroom: string | null;
    group: Named;
    course: Named;
    teacher: Ref | null;
    isCancelled: boolean;
    cancelReason: string | null;
    isMakeup: boolean;
  }[];
  holidays: { date: string; description: string }[];
}

export interface PortalAttendance {
  summary: AttendanceSummary;
  alert: { threshold: number; unexcusedAbsences: number; reached: boolean; nearing: boolean };
  courses: { course: Named; counts: StatusCounts; attendanceRate: number | null }[];
  records: {
    id: string;
    status: AttendanceStatus;
    statusLabel: string;
    note: string | null;
    date: string;
    startTime: string;
    endTime: string;
    isMakeup: boolean;
    course: Named;
    group: Named;
    teacher: Ref | null;
  }[];
}

export type HomeworkStatus = 'PENDING' | 'SUBMITTED' | 'MISSED';

export interface PortalAssignmentSummary {
  id: string;
  title: string;
  dueAt: string | null;
  allowText: boolean;
  allowFile: boolean;
  createdAt: string;
  course: Named;
  group: Named;
  teacher: Ref | null;
  submittedAt: string | null;
  status: HomeworkStatus;
}

export interface SubmissionView {
  id: string;
  text: string | null;
  file: { name: string; size: number | null } | null;
  submittedAt: string;
  updatedAt: string;
}

export interface PortalAssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  allowText: boolean;
  allowFile: boolean;
  createdAt: string;
  updatedAt: string;
  course: Named;
  group: Named;
  teacher: Ref | null;
  canSubmit: boolean;
  maxFileBytes: number;
  submission: SubmissionView | null;
}

export interface StaffAssignment {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  isOpen: boolean;
  allowText: boolean;
  allowFile: boolean;
  createdAt: string;
  scheduleId: string;
  course: Named;
  group: Named;
  teacher: Ref | null;
  institution: Ref | null;
  submittedCount: number;
  rosterSize: number;
}

export interface StaffAssignmentDetail extends StaffAssignment {
  students: {
    student: {
      id: string;
      studentNumber: string;
      firstName: string;
      lastName: string;
      fullName: string;
    };
    submission: SubmissionView | null;
  }[];
}

export interface StudentAccount {
  id: string;
  username: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
