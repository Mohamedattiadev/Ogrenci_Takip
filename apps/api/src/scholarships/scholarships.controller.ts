import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import {
  AssignmentQueryDto,
  AssignmentStatusDto,
  CreateScholarshipDto,
  CreateTeacherAssignmentDto,
  ProgramQueryDto,
  UpdateScholarshipDto,
} from './scholarships.dto';
import { ScholarshipProgramsService, TeacherAssignmentsService } from './scholarships.service';

@ApiTags('scholarship-programs')
@ApiBearerAuth()
@Controller({ path: 'scholarship-programs', version: '1' })
export class ScholarshipProgramsController {
  constructor(private readonly programs: ScholarshipProgramsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'ScholarshipProgram'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ProgramQueryDto) {
    return this.programs.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'ScholarshipProgram'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.programs.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'ScholarshipProgram'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScholarshipDto) {
    return this.programs.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'ScholarshipProgram'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScholarshipDto,
  ) {
    return this.programs.update(user, id, dto);
  }
}

@ApiTags('teacher-assignments')
@ApiBearerAuth()
@Controller({ path: 'teacher-assignments', version: '1' })
export class TeacherAssignmentsController {
  constructor(private readonly assignments: TeacherAssignmentsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'TeacherAssignment'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AssignmentQueryDto) {
    return this.assignments.list(user, query);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'TeacherAssignment'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTeacherAssignmentDto) {
    return this.assignments.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'TeacherAssignment'))
  setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignmentStatusDto,
  ) {
    return this.assignments.setActive(user, id, dto.isActive);
  }
}
