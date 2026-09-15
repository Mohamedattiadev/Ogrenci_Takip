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
import { CreateTermDto, TermQueryDto, UpdateTermDto } from './terms.dto';
import { TermsService } from './terms.service';

@ApiTags('terms')
@ApiBearerAuth()
@Controller({ path: 'terms', version: '1' })
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'AcademicTerm'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: TermQueryDto) {
    return this.terms.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'AcademicTerm'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.terms.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'AcademicTerm'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTermDto) {
    return this.terms.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'AcademicTerm'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTermDto,
  ) {
    return this.terms.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'AcademicTerm'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.terms.remove(user, id);
  }
}
