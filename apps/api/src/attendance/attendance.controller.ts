import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { QrTokenService } from '../students/qr-token.service';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto, ScanQrDto, UpdateAttendanceDto } from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly qrTokens: QrTokenService,
  ) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'AttendanceRecord'))
  markBulk(@CurrentUser() user: AuthenticatedUser, @Body() dto: MarkAttendanceDto) {
    return this.attendance.markBulk(toTenantContext(user), dto);
  }

  /** Ogrenci kartindaki QR kodu okutarak tek dokunusla "Geldi" isaretler. */
  @Post('scan')
  @CheckPolicies((a) => a.can('create', 'AttendanceRecord'))
  scanQr(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScanQrDto) {
    const studentId = this.qrTokens.decode(dto.token);
    return this.attendance.scanQr(toTenantContext(user), dto.sessionOccurrenceId, studentId);
  }

  @Get('occurrence/:occurrenceId')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  getForOccurrence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('occurrenceId') occurrenceId: string,
  ) {
    return this.attendance.getForOccurrence(toTenantContext(user), occurrenceId);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'AttendanceRecord'))
  updateOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendance.updateOne(toTenantContext(user), id, dto);
  }

  @Get('student/:studentId/history')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  history(@CurrentUser() user: AuthenticatedUser, @Param('studentId') studentId: string) {
    return this.attendance.historyForStudent(toTenantContext(user), studentId);
  }
}
