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
import {
  AddMembersDto,
  CreateGroupDto,
  EndMembershipQueryDto,
  GroupQueryDto,
  MembersQueryDto,
  UpdateGroupDto,
} from './dto/group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@Controller({ path: 'groups', version: '1' })
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Group'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: GroupQueryDto) {
    return this.groups.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Group'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.groups.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Group'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Group'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Group'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.groups.remove(user, id);
  }

  @Get(':id/members')
  @CheckPolicies((a) => a.can('read', 'Group'))
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MembersQueryDto,
  ) {
    return this.groups.members(user, id, query);
  }

  @Post(':id/members')
  @CheckPolicies((a) => a.can('update', 'Group'))
  addMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.groups.addMembers(user, id, dto);
  }

  @Delete(':id/members/:studentId')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('update', 'Group'))
  endMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: EndMembershipQueryDto,
  ) {
    return this.groups.endMembership(user, id, studentId, query);
  }
}
