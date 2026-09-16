import type { AttendanceStatus } from '@yoklama/db';

export const ATTENDANCE_ABSENCE_EVENT = 'attendance.absence';

/** Bir ogrenci "devamsiz" (ABSENT/ABSENT_EXCUSED) olarak isaretlendiginde yayinlanir. */
export class AttendanceAbsenceEvent {
  constructor(
    public readonly institutionId: string,
    public readonly studentId: string,
    public readonly status: AttendanceStatus,
    public readonly sessionDate: Date,
  ) {}
}
