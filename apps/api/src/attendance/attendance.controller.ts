import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto, UpdateAttendanceDto } from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceQueryDto) {
    return this.attendance.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attendance.get(user, id);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'AttendanceRecord'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendance.update(user, id, dto);
  }

  @Get(':id/history')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  history(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.attendance.history(user, id);
  }
}
