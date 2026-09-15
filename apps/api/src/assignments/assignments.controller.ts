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
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { fileResponse } from '../common/db-helpers';
import {
  AssignmentListQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './assignments.dto';
import { AssignmentsService } from './assignments.service';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller({ path: 'assignments', version: '1' })
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Assignment'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AssignmentListQueryDto) {
    return this.assignments.list(user, query);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Assignment'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(user, dto);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Assignment'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.get(user, id);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Assignment'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignments.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Assignment'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.remove(user, id);
  }

  @Get(':id/submissions/:studentId/file')
  @CheckPolicies((a) => a.can('read', 'Assignment'))
  async file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.assignments.file(user, id, studentId);
    return fileResponse(res, file.data, file.fileName, 'application/pdf');
  }
}
