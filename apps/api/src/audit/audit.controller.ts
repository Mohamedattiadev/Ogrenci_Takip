import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { PageQueryDto } from '../common/pagination';
import { AuditService } from './audit.service';

export class AuditQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ example: 'AttendanceRecord' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() actorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'AuditLog'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.list(user, query);
  }
}
