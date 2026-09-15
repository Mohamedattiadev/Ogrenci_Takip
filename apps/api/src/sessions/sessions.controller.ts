import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import {
  AllPresentQueryDto,
  CancelSessionDto,
  CreateMakeupDto,
  GenerateSessionsDto,
  MarkAttendanceDto,
  ScanQrDto,
  SessionQueryDto,
  TodayQueryDto,
} from './sessions.dto';
import { SessionsService } from './sessions.service';

/** Somut ders gunleri (oturumlar) ve oturum bazli yoklama. */
@ApiTags('sessions')
@ApiBearerAuth()
@Controller({ path: 'sessions', version: '1' })
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Session'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SessionQueryDto) {
    return this.sessions.list(user, query);
  }

  /** Hoca: kendi bugunku dersleri. Yonetici: yurdun bugunku dersleri. */
  @Get('today')
  @CheckPolicies((a) => a.can('read', 'Session'))
  today(@CurrentUser() user: AuthenticatedUser, @Query() query: TodayQueryDto) {
    return this.sessions.today(user, query);
  }

  @Post('generate')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('create', 'Session'))
  generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: GenerateSessionsDto) {
    return this.sessions.generate(user, dto);
  }

  /** Telafi dersi. */
  @Post()
  @CheckPolicies((a) => a.can('create', 'Session'))
  createMakeup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMakeupDto) {
    return this.sessions.createMakeup(user, dto);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Session'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.get(user, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Session'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.remove(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Session'))
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSessionDto,
  ) {
    return this.sessions.cancel(user, id, dto);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Session'))
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.restore(user, id);
  }

  /** Yoklama listesi: o tarihte gruba kayitli ogrenciler + mevcut isaretlemeler. */
  @Get(':id/attendance')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  roster(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.roster(user, id);
  }

  @Put(':id/attendance')
  @CheckPolicies(
    (a) => a.can('create', 'AttendanceRecord'),
    (a) => a.can('update', 'AttendanceRecord'),
  )
  mark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.sessions.mark(user, id, dto);
  }

  @Post(':id/attendance/all-present')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('create', 'AttendanceRecord'))
  allPresent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AllPresentQueryDto,
  ) {
    return this.sessions.markAllPresent(user, id, query);
  }

  /** Ogrenci kartindaki QR kod okutularak "Geldi" isaretlenir. */
  @Post(':id/attendance/scan')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('create', 'AttendanceRecord'))
  scan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScanQrDto,
  ) {
    return this.sessions.scan(user, id, dto.token);
  }
}
