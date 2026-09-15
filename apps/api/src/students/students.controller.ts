import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { fileResponse } from '../common/db-helpers';
import {
  CreateStudentDto,
  DateRangeQueryDto,
  GroupTransferDto,
  ImportQueryDto,
  StudentExportQueryDto,
  StudentQueryDto,
  UpdateStudentDto,
  WithdrawStudentDto,
} from './dto/create-student.dto';
import { QrTokenService } from './qr-token.service';
import { StudentsService } from './students.service';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('students')
@ApiBearerAuth()
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly qrTokens: QrTokenService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Student'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: StudentQueryDto) {
    return this.students.list(user, query);
  }

  /** Liste filtreleriyle ayni; sayfalama yok (en fazla 10.000 satir). */
  @Get('export')
  @CheckPolicies((a) => a.can('read', 'Student'))
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentExportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, exporter } = await this.students.export(user, query);
    return fileResponse(res, buffer, `ogrenciler.${exporter.fileExtension}`, exporter.contentType);
  }

  @Get('import-template')
  @CheckPolicies((a) => a.can('create', 'Student'))
  async importTemplate(@Res({ passthrough: true }) res: Response) {
    return fileResponse(
      res,
      await this.students.importTemplate(),
      'ogrenci-aktarim-sablonu.xlsx',
      XLSX,
    );
  }

  @Post('import')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @CheckPolicies((a) => a.can('create', 'Student'))
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  import(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ImportQueryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('"file" alaninda bir .xlsx dosyasi gonderin');
    return this.students.importFromExcel(user, file.buffer, query.institutionId);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Student'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.students.create(user, dto);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Student'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.students.get(user, id);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Student'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Student'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.students.remove(user, id);
  }

  @Post(':id/withdraw')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Student'))
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawStudentDto,
  ) {
    return this.students.withdraw(user, id, dto);
  }

  @Post(':id/reinstate')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('update', 'Student'))
  reinstate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.students.reinstate(user, id);
  }

  @Get(':id/groups')
  @CheckPolicies((a) => a.can('read', 'Student'))
  groups(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.students.groups(user, id);
  }

  @Post(':id/group-transfers')
  @CheckPolicies((a) => a.can('update', 'Student'), (a) => a.can('update', 'Group'))
  transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GroupTransferDto,
  ) {
    return this.students.transfer(user, id, dto);
  }

  @Get(':id/attendance')
  @CheckPolicies((a) => a.can('read', 'AttendanceRecord'))
  attendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.students.attendance(user, id, query);
  }

  @Get(':id/qr-token')
  @CheckPolicies((a) => a.can('read', 'Student'))
  async qrToken(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    // Ayrilmis/baska kuruma ait ogrenci icin kart uretilemesin (RLS + soft-delete kontrolu).
    await this.students.get(user, id);
    return { token: this.qrTokens.generate(id) };
  }
}
