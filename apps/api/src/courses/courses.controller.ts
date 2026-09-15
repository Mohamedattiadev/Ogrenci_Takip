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
import { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './courses.dto';
import { CoursesService } from './courses.service';

@ApiTags('courses')
@ApiBearerAuth()
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Course'))
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: CourseQueryDto) {
    return this.courses.list(user, query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Course'))
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.get(user, id);
  }

  @Post()
  @CheckPolicies((a) => a.can('create', 'Course'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto) {
    return this.courses.create(user, dto);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Course'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies((a) => a.can('delete', 'Course'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(user, id);
  }
}
