import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { fileResponse } from '../common/db-helpers';
import { getReportExporter } from './exporters/report-exporter.factory';
import { ReportQueryDto, TopAbsenteesQueryDto } from './reports.dto';
import { ReportsService, type Report } from './reports.service';

function slug(title: string) {
  return title
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * ?format=json (varsayilan) -> { title, period, columns, rows }
 * ?format=csv|excel|pdf     -> dosya indirme
 */
async function respond(res: Response, report: Report, query: ReportQueryDto) {
  if (query.format === 'json') {
    return {
      title: report.title,
      period: { from: query.from, to: query.to },
      generatedAt: new Date(),
      columns: report.columns,
      rows: report.rows,
    };
  }
  const exporter = getReportExporter(query.format);
  const rows = report.rows.length
    ? report.rows
    : [Object.fromEntries(report.columns.map((column) => [column, '']))];
  const buffer = await exporter.export(rows, report.title);
  return fileResponse(
    res,
    buffer,
    `${slug(report.title)}_${query.from}_${query.to}.${exporter.fileExtension}`,
    exporter.contentType,
  );
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('student-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async studentAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.studentAttendance(user, query), query);
  }

  @Get('group-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async groupAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.groupAttendance(user, query), query);
  }

  @Get('course-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async courseAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.courseAttendance(user, query), query);
  }

  @Get('teacher-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async teacherAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.teacherAttendance(user, query), query);
  }

  @Get('top-absentees')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async topAbsentees(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TopAbsenteesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.topAbsentees(user, query), query);
  }

  @Get('missing-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async missingAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.missingAttendance(user, query), query);
  }

  @Get('excused-and-late')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async excusedAndLate(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.excusedAndLate(user, query), query);
  }

  @Get('attendance-trend')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async attendanceTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return respond(res, await this.reports.attendanceTrend(user, query), query);
  }
}
