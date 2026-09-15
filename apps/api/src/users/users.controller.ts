import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'User'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.create(toTenantContext(user), dto);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'User'))
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.users.findAll(toTenantContext(user));
  }

  @Patch(':id/deactivate')
  @CheckPolicies((a) => a.can('update', 'User'))
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.users.deactivate(toTenantContext(user), id);
  }
}
