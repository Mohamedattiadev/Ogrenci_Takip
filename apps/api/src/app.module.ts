import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PoliciesGuard } from './auth/policies.guard';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GroupsModule } from './groups/groups.module';
import { HealthController } from './health/health.controller';
import { HolidaysModule } from './holidays/holidays.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortalModule } from './portal/portal.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { SessionsModule } from './sessions/sessions.module';
import { StudentsModule } from './students/students.module';
import { TermsModule } from './terms/terms.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    RealtimeModule,
    AuthModule,
    UsersModule,
    AssignmentsModule,
    PortalModule,
    InstitutionsModule,
    ScholarshipsModule,
    TermsModule,
    StudentsModule,
    GroupsModule,
    CoursesModule,
    ScheduleModule,
    SessionsModule,
    HolidaysModule,
    AttendanceModule,
    ReportsModule,
    DashboardModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Sira onemli: once kimlik dogrulama, sonra yetki kontrolu.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PoliciesGuard },
  ],
})
export class AppModule {}
