import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
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
import { PortalAttendanceQueryDto, SubmissionDto, UpdateOwnProfileDto } from './portal.dto';
import { MAX_PDF_BYTES, PortalService } from './portal.service';

/** Ogrenci paneli: sadece STUDENT rolu. Veri kapsami veritabani kurallarinda (RLS). */
@ApiTags('portal')
@ApiBearerAuth()
@Controller({ path: 'portal', version: '1' })
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get('profile')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.portal.profile(user);
  }

  /** Sadece izinli alanlar (bkz. editableFields). */
  @Patch('profile')
  @CheckPolicies((a) => a.can('update', 'StudentPortal'))
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOwnProfileDto) {
    return this.portal.updateProfile(user, dto);
  }

  @Get('schedule')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  schedule(@CurrentUser() user: AuthenticatedUser) {
    return this.portal.schedule(user);
  }

  @Get('attendance')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  attendance(@CurrentUser() user: AuthenticatedUser, @Query() query: PortalAttendanceQueryDto) {
    return this.portal.attendance(user, query);
  }

  @Get('assignments')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  assignments(@CurrentUser() user: AuthenticatedUser) {
    return this.portal.assignments(user);
  }

  @Get('assignments/:id')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  assignment(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.assignment(user, id);
  }

  @Put('assignments/:id/submission')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        file: { type: 'string', format: 'binary', description: 'PDF, en fazla 10 MB' },
        removeFile: { type: 'boolean' },
      },
    },
  })
  @CheckPolicies((a) => a.can('update', 'StudentPortal'))
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }))
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmissionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.portal.submit(user, id, dto, file);
  }

  @Delete('assignments/:id/submission')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('update', 'StudentPortal'))
  removeSubmission(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.removeSubmission(user, id);
  }

  @Get('assignments/:id/submission/file')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  async ownFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.portal.ownFile(user, id);
    return fileResponse(res, file.data, file.fileName, 'application/pdf');
  }

  /** KVKK: kendi verilerimi indir (JSON). */
  @Get('export')
  @CheckPolicies((a) => a.can('read', 'StudentPortal'))
  async export(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.portal.exportData(user);
    return fileResponse(
      res,
      Buffer.from(JSON.stringify(data, null, 2), 'utf8'),
      'kisisel-verilerim.json',
      'application/json; charset=utf-8',
    );
  }
}
