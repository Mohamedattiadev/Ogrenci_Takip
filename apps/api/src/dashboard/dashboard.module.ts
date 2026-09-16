import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { withTenant } from '@yoklama/db';
import { IsOptional, IsUUID } from 'class-validator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { summarize } from '../common/attendance-stats';
import { addDays, todayInTurkey } from '../common/dates';
import { userNames } from '../common/lookups';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionsService } from '../sessions/sessions.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, AnalyticsDetailDto } from './analytics.dto';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Sistem yoneticisi icin yurt filtresi' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly sessions: SessionsService) {}

  /** Genel Bakis ekrani: sayilar, bugunku dersler, son 30 gun devam ve son aktiviteler. */
  async summary(user: AuthenticatedUser, query: DashboardQueryDto) {
    const today = todayInTurkey();
    const since = addDays(today, -30);
    const institution = query.institutionId ? { institutionId: query.institutionId } : {};
    const scheduleScope = query.institutionId ? { schedule: institution } : {};

    const [data, todayView] = await Promise.all([
      withTenant(toTenantContext(user), async (tx) => {
        const [
          activeStudents,
          activeGroups,
          activeTeachers,
          statusCounts,
          missingAttendance,
          recentStudents,
          recentSessions,
        ] = await Promise.all([
          tx.student.count({ where: { ...institution, deletedAt: null, withdrawDate: null } }),
          tx.group.count({
            where: { ...institution, deletedAt: null, term: { endDate: { gte: today } } },
          }),
          tx.user.count({
            where: {
              role: 'TEACHER',
              isActive: true,
              deletedAt: null,
              ...(query.institutionId
                ? {
                    OR: [
                      { institutionId: query.institutionId },
                      {
                        assignments: {
                          some: { institutionId: query.institutionId, isActive: true },
                        },
                      },
                    ],
                  }
                : {}),
            },
          }),
          tx.attendanceRecord.groupBy({
            by: ['status'],
            where: { sessionOccurrence: { date: { gte: since, lte: today }, ...scheduleScope } },
            _count: { _all: true },
          }),
          tx.sessionOccurrence.count({
            where: {
              date: { gte: since, lte: today },
              isCancelled: false,
              attendanceRecords: { none: {} },
              ...scheduleScope,
            },
          }),
          tx.student.findMany({
            where: { ...institution, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, firstName: true, lastName: true, createdAt: true },
          }),
          tx.sessionOccurrence.findMany({
            where: { attendanceRecords: { some: {} }, ...scheduleScope },
            orderBy: { date: 'desc' },
            take: 5,
            select: {
              id: true,
              schedule: {
                select: {
                  teacherId: true,
                  group: { select: { name: true } },
                  course: { select: { name: true } },
                },
              },
              attendanceRecords: {
                select: { markedAt: true, markedById: true },
                orderBy: { markedAt: 'desc' },
                take: 1,
              },
            },
          }),
        ]);
        const names = await userNames(
          tx,
          recentSessions.map((s) => s.attendanceRecords[0]?.markedById),
        );
        const attendance = summarize(statusCounts.map((c) => [c.status, c._count._all] as const));
        const activity = [
          ...recentStudents.map((s) => ({
            type: 'student' as const,
            text: `Yeni öğrenci eklendi: ${s.firstName} ${s.lastName}`,
            at: s.createdAt,
            entityId: s.id,
          })),
          ...recentSessions.map((s) => {
            const last = s.attendanceRecords[0]!;
            const who = names.get(last.markedById) ?? 'Bir kullanıcı';
            return {
              type: 'attendance' as const,
              text: `${who}, ${s.schedule.group.name} (${s.schedule.course.name}) için yoklama girdi`,
              at: last.markedAt,
              entityId: s.id,
            };
          }),
        ]
          .sort((a, b) => b.at.getTime() - a.at.getTime())
          .slice(0, 8);
        return {
          counts: { activeStudents, activeGroups, activeTeachers },
          attendance,
          missingAttendance,
          activity,
        };
      }),
      this.sessions.today(user, { institutionId: query.institutionId }),
    ]);

    return {
      date: todayView.date,
      stats: {
        ...data.counts,
        todaysLessons: todayView.lessons.filter((l) => !l.session?.isCancelled).length,
        attendanceRateLast30Days: data.attendance.attendanceRate,
        attendanceRecordsLast30Days: data.attendance.total,
        missingAttendanceLast30Days: data.missingAttendance,
      },
      today: todayView,
      recentActivity: data.activity,
    };
  }
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('analytics')
  @CheckPolicies((a) => a.can('read', 'Dashboard') || a.can('manage', 'StudentPortal'))
  analyticsSummary(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsQueryDto) {
    return this.analytics.summary(user, query);
  }

  @Get('analytics/details')
  @CheckPolicies((a) => a.can('read', 'Dashboard') || a.can('manage', 'StudentPortal'))
  analyticsDetails(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsDetailDto) {
    return this.analytics.details(user, query);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Dashboard'))
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardQueryDto) {
    return this.dashboard.summary(user, query);
  }
}

@Module({
  imports: [SessionsModule],
  controllers: [DashboardController],
  providers: [DashboardService, AnalyticsService],
})
export class DashboardModule {}
