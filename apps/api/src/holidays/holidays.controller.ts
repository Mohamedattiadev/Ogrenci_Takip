import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { CreateHolidayDto, HolidayQueryDto } from './holidays.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('holidays')
@ApiBearerAuth()
@Controller({ path: 'holidays', version: '1' })
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Holiday'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: HolidayQueryDto) {
    return this.holidays.list(user, query);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Holiday'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHolidayDto) {
    return this.holidays.create(user, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Holiday'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.holidays.remove(user, id);
  }
}
