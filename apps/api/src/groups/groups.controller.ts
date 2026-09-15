import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { GroupsService } from './groups.service';
import { AssignMembershipDto, CreateGroupDto } from './dto/group.dto';

@ApiTags('groups')
@ApiBearerAuth()
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'Group'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(toTenantContext(user), dto);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Group'))
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('termId') termId?: string) {
    return this.groups.findAll(toTenantContext(user), termId);
  }

  @Get(':id/members')
  @CheckPolicies((a) => a.can('read', 'Group'))
  members(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groups.members(toTenantContext(user), id);
  }

  @Post('memberships')
  @CheckPolicies((a) => a.can('update', 'Group'))
  assign(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssignMembershipDto) {
    return this.groups.assign(toTenantContext(user), dto);
  }

  @Get('memberships/student/:studentId/history')
  @CheckPolicies((a) => a.can('read', 'Group'))
  history(@CurrentUser() user: AuthenticatedUser, @Param('studentId') studentId: string) {
    return this.groups.history(toTenantContext(user), studentId);
  }
}
