import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { ScholarshipsService } from './scholarships.service';
import {
  AssignmentStatusDto,
  CreateScholarshipDto,
  CreateTeacherAssignmentDto,
} from './scholarships.dto';

@ApiTags('scholarships')
@ApiBearerAuth()
@Controller({ path: 'scholarships', version: '1' })
export class ScholarshipsController {
  constructor(private readonly service: ScholarshipsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'ScholarshipProgram'))
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(toTenantContext(user));
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'ScholarshipProgram'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScholarshipDto) {
    return this.service.create(toTenantContext(user), dto);
  }

  @Get('assignments')
  @CheckPolicies((a) => a.can('read', 'TeacherAssignment'))
  assignments(@CurrentUser() user: AuthenticatedUser) {
    return this.service.assignments(toTenantContext(user));
  }

  @Post('assignments')
  @CheckPolicies((a) => a.can('create', 'TeacherAssignment'))
  assign(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTeacherAssignmentDto) {
    return this.service.assign(toTenantContext(user), dto);
  }

  @Patch('assignments/:id')
  @CheckPolicies((a) => a.can('update', 'TeacherAssignment'))
  setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignmentStatusDto,
  ) {
    return this.service.setActive(toTenantContext(user), id, dto.isActive);
  }
}
