import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { UserRole } from '@yoklama/db';
import type { AuthenticatedUser } from './types';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type Subject =
  | 'Institution'
  | 'User'
  | 'Student'
  | 'Group'
  | 'Course'
  | 'AcademicTerm'
  | 'Schedule'
  | 'Session'
  | 'Holiday'
  | 'AttendanceRecord'
  | 'Report'
  | 'Dashboard'
  | 'AuditLog'
  | 'Notification'
  | 'ScholarshipProgram'
  | 'TeacherAssignment'
  | 'Assignment'
  | 'StudentAccount'
  | 'StudentPortal'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Rol -> yetenek eslemesi TEK burada tutulur. TDV sorumlusuyla goruslup
 * "ogretmen sunu da yapabilsin" gibi degisiklikler geldiginde sadece bu
 * dosya degisir; controller'lara dokunulmaz.
 *
 * Not: kurum bazli veri izolasyonu (bir kurumun digerini gormemesi, hocanin
 * sadece kendi derslerini gormesi) burada degil, Postgres RLS'te saglaniyor
 * (bkz. packages/db). Bu factory sadece "bu rol bu eylemi yapabilir mi" sorusuna cevap verir.
 */
@Injectable()
export class AbilityFactory {
  createForUser(user: AuthenticatedUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        can('manage', 'all');
        break;

      case UserRole.INSTITUTION_ADMIN:
        can('read', ['Institution', 'ScholarshipProgram', 'TeacherAssignment']);
        can('manage', [
          'Student',
          'Group',
          'Course',
          'AcademicTerm',
          'Schedule',
          'Session',
          'Holiday',
          'AttendanceRecord',
          'User',
          'StudentAccount',
          'Assignment',
        ]);
        can('read', ['Report', 'Dashboard', 'AuditLog', 'Notification']);
        break;

      case UserRole.TEACHER:
        can('read', [
          'Institution',
          'ScholarshipProgram',
          'TeacherAssignment',
          'Student',
          'Group',
          'Course',
          'AcademicTerm',
          'Schedule',
          'Session',
          'Holiday',
          'Dashboard',
          'Report',
        ]);
        can(['read', 'create', 'update'], 'AttendanceRecord');
        can('manage', 'Assignment');
        // Ogrenciyi baska gruba tasiyabilir - yalnizca kendi ders verdigi gruplar arasinda,
        // gercek sinir Postgres RLS'te (bkz. dormitory-policies.sql, app_teaches_student/app_teaches_group).
        can('update', 'Group');
        break;

      case UserRole.GROUP_LEADER:
        can('read', ['Student', 'Group', 'Schedule', 'Session', 'AttendanceRecord']);
        break;

      // Ogrenci sadece kendi paneli: bilgileri, dersleri, yoklamasi, odevleri (veri kapsami RLS'te).
      case UserRole.STUDENT:
        can('manage', 'StudentPortal');
        break;
    }

    return build();
  }
}
