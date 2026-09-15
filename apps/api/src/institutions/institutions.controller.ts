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
  CreateInstitutionDto,
  InstitutionQueryDto,
  UpdateInstitutionDto,
} from './dto/create-institution.dto';
import { InstitutionsService } from './institutions.service';

@ApiTags('institutions')
@ApiBearerAuth()
@Controller({ path: 'institutions', version: '1' })
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Institution'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: InstitutionQueryDto) {
    return this.institutions.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Institution'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.institutions.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Institution'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInstitutionDto) {
    return this.institutions.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Institution'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutions.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Institution'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.institutions.remove(user, id);
  }
}
