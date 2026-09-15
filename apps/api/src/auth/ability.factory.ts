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
  | 'Schedule'
  | 'AttendanceRecord'
  | 'Report'
  | 'ScholarshipProgram'
  | 'TeacherAssignment'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Rol -> yetenek eslemesi TEK burada tutulur. TDV sorumlusuyla goruslup
 * "ogretmen sunu da yapabilsin" gibi degisiklikler geldiginde sadece bu
 * dosya degisir; controller'lara dokunulmaz.
 *
 * Not: kurum bazli veri izolasyonu (bir kurumun digerini gormemesi) burada
 * degil, Postgres RLS'te saglaniyor (bkz. packages/db). Bu factory sadece
 * "bu rol bu eylemi yapabilir mi" sorusuna cevap verir.
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
        can('read', ['ScholarshipProgram', 'TeacherAssignment']);
        can('read', 'Institution');
        can('manage', ['Student', 'Group', 'Course', 'Schedule', 'AttendanceRecord', 'User']);
        can('read', 'Report');
        break;

      case UserRole.TEACHER:
        can('read', ['ScholarshipProgram', 'TeacherAssignment']);
        can('read', ['Student', 'Group', 'Schedule']);
        can(['read', 'create', 'update'], 'AttendanceRecord');
        can('read', 'Report');
        break;

      case UserRole.GROUP_LEADER:
        can('read', ['Student', 'Group', 'AttendanceRecord']);
        break;
    }

    return build();
  }
}
