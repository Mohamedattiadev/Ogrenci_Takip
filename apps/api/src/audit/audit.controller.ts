import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Report'))
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('entityType') entityType?: string) {
    return this.audit.findAll(toTenantContext(user), entityType);
  }
}
