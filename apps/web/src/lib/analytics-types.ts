export type AnalyticsCategory = 'attended' | 'absent' | 'excused' | 'unrecorded';
export interface Analytics {
  personal: boolean;
  from: string;
  to: string;
  counts: { students: number; teachers: number; groups: number; todayLessons: number };
  attendanceRate: number | null;
  totalRecords: number;
  recordedStudents: number;
  distribution: { key: AnalyticsCategory; label: string; count: number; percent: number | null }[];
  days: { date: string; rate: number | null; total: number }[];
  groups: { id: string; name: string; count: number }[];
}
export interface AnalyticsDetail {
  id: string;
  name: string;
  studentNumber?: string;
  institution?: string;
  groups?: string[];
  category?: AnalyticsCategory;
  attended?: number;
  absent?: number;
  excused?: number;
  rate?: number | null;
  date?: string;
  time?: string;
  status?: string;
}
