import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';

@ApiTags('institutions')
@ApiBearerAuth()
@Controller({ path: 'institutions', version: '1' })
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Post()
  @CheckPolicies((a) => a.can('manage', 'Institution'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInstitutionDto) {
    return this.institutions.create(toTenantContext(user), dto);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Institution'))
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.institutions.findAll(toTenantContext(user));
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Institution'))
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.institutions.findOne(toTenantContext(user), id);
  }
}
