import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { CheckPolicies } from '../auth/check-policies.decorator';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { StudentsService } from './students.service';
import { QrTokenService } from './qr-token.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';

@ApiTags('students')
@ApiBearerAuth()
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly qrTokens: QrTokenService,
  ) {}

  @Post()
  @CheckPolicies((a) => a.can('create', 'Student'))
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.students.create(toTenantContext(user), dto);
  }

  @Get()
  @CheckPolicies((a) => a.can('read', 'Student'))
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.students.findAll(toTenantContext(user), search);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Student'))
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.students.findOne(toTenantContext(user), id);
  }

  @Patch(':id')
  @CheckPolicies((a) => a.can('update', 'Student'))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(toTenantContext(user), id, dto);
  }

  @Delete(':id')
  @CheckPolicies((a) => a.can('delete', 'Student'))
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.students.remove(toTenantContext(user), id);
  }

  @Get(':id/qr-token')
  @CheckPolicies((a) => a.can('read', 'Student'))
  async qrToken(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    // Ogrenci bu kurumda gercekten var mi kontrolu (RLS + soft-delete) -
    // ayrilmis/baska kuruma ait bir ogrenci icin kart uretilemesin.
    await this.students.findOne(toTenantContext(user), id);
    return { token: this.qrTokens.generate(id) };
  }

  @Post('import')
  @ApiConsumes('multipart/form-data')
  @CheckPolicies((a) => a.can('create', 'Student'))
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    return this.students.importFromExcel(toTenantContext(user), file.buffer);
  }
}
