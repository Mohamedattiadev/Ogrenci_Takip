import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { CreateScheduleDto, ScheduleQueryDto, UpdateScheduleDto } from './dto/schedule.dto';
import { ScheduleService } from './schedule.service';

/** Haftalik tekrar eden ders programi. Somut ders gunleri icin bkz. /sessions. */
@ApiTags('schedules')
@ApiBearerAuth()
@Controller({ path: 'schedules', version: '1' })
export class ScheduleController {
  constructor(private readonly schedules: ScheduleService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Schedule'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ScheduleQueryDto) {
    return this.schedules.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Schedule'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.schedules.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Schedule'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Schedule'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedules.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Schedule'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.schedules.remove(user, id);
  }
}
