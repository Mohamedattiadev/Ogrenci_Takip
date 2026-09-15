import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { CoursesService } from './courses.service';

class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

@ApiTags('courses')
@ApiBearerAuth()
@Controller({ path: 'courses', version: '1' })
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'Course'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto) {
    return this.courses.create(toTenantContext(user), dto.name);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Course'))
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.courses.findAll(toTenantContext(user));
  }
}
