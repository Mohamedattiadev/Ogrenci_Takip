import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { ScheduleService } from './schedule.service';
import {
  CancelOccurrenceDto,
  CreateHolidayDto,
  CreateScheduleDto,
  GenerateOccurrencesDto,
} from './dto/schedule.dto';

@ApiTags('schedule')
@ApiBearerAuth()
@Controller({ path: 'schedule', version: '1' })
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'Schedule'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduleDto) {
    return this.schedule.createSchedule(toTenantContext(user), dto);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Schedule'))
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('teacherId') teacherId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.schedule.findAll(toTenantContext(user), teacherId, groupId);
  }

  @Get('today')
  @CheckPolicies((a) => a.can('read', 'Schedule'))
  today(@CurrentUser() user: AuthenticatedUser, @Query('teacherId') teacherId: string) {
    return this.schedule.todaysSessionsForTeacher(toTenantContext(user), teacherId, new Date());
  }

  @Post(':id/occurrences')
  @CheckPolicies((a) => a.can('update', 'Schedule'))
  generateOccurrences(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GenerateOccurrencesDto,
  ) {
    return this.schedule.generateOccurrences(toTenantContext(user), id, dto);
  }

  @Post('occurrences/:id/cancel')
  @CheckPolicies((a) => a.can('update', 'Schedule'))
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelOccurrenceDto,
  ) {
    return this.schedule.cancelOccurrence(toTenantContext(user), id, dto);
  }

  @Post(':id/makeup')
  @CheckPolicies((a) => a.can('update', 'Schedule'))
  makeup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('date') date: string,
  ) {
    return this.schedule.createMakeup(toTenantContext(user), id, date);
  }

  @Post('holidays')
  @CheckPolicies((a) => a.can('manage', 'Schedule'))
  createHoliday(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHolidayDto) {
    return this.schedule.createHoliday(toTenantContext(user), dto);
  }

  @Get('holidays')
  @CheckPolicies((a) => a.can('read', 'Schedule'))
  listHolidays(@CurrentUser() user: AuthenticatedUser) {
    return this.schedule.listHolidays(toTenantContext(user));
  }
}
