import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { ReportsService } from './reports.service';
import { getReportExporter, type ReportFormat } from './exporters/report-exporter.factory';
import type { ReportRow } from './exporters/report-exporter.interface';

async function respond(res: Response, rows: ReportRow[], title: string, format?: string) {
  if (!format || format === 'json') {
    res.json(rows);
    return;
  }
  const exporter = getReportExporter(format as ReportFormat);
  const buffer = await exporter.export(rows, title);
  res.set({
    'Content-Type': exporter.contentType,
    'Content-Disposition': `attachment; filename="${title}.${exporter.fileExtension}"`,
  });
  res.send(buffer);
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('student-absence-summary')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async absenceSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const rows = await this.reports.studentAbsenceSummary(
      toTenantContext(user),
      new Date(from),
      new Date(to),
    );
    await respond(res, rows, 'ogrenci-devamsizlik-raporu', format);
  }

  @Get('missing-attendance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async missingAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const rows = await this.reports.missingAttendanceSessions(
      toTenantContext(user),
      new Date(from),
      new Date(to),
    );
    await respond(res, rows, 'yoklamasi-girilmeyen-dersler', format);
  }

  @Get('top-absentees')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async topAbsentees(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const rows = await this.reports.topAbsentees(
      toTenantContext(user),
      new Date(from),
      new Date(to),
      limit ? Number(limit) : 10,
    );
    await respond(res, rows, 'en-fazla-devamsizlik-yapan-ogrenciler', format);
  }

  @Get('attendance-trend')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async attendanceTrend(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupId') groupId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const rows = await this.reports.attendanceTrend(
      toTenantContext(user),
      new Date(from),
      new Date(to),
      groupId,
    );
    await respond(res, rows, 'haftalik-devam-trendi', format);
  }

  @Get('teacher-compliance')
  @CheckPolicies((a) => a.can('read', 'Report'))
  async teacherCompliance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const rows = await this.reports.teacherAttendanceCompliance(
      toTenantContext(user),
      new Date(from),
      new Date(to),
    );
    await respond(res, rows, 'ogretmen-yoklama-girisi', format);
  }
}
