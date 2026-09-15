import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { ToBoolean, Trim } from '../common/transforms';

export class ProgramQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
}

export class CreateScholarshipDto {
  @ApiProperty({ example: 'ILAHIYAT_AKADEMI', description: 'Buyuk harf, rakam ve alt cizgi' })
  @Trim()
  @IsString()
  @Matches(/^[A-Z0-9_]{2,50}$/, { message: 'Kod buyuk harf, rakam ve alt cizgiden olusmali' })
  code!: string;

  @ApiProperty({ example: 'İlahiyat Akademi' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}

export class UpdateScholarshipDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignmentQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scholarshipProgramId?: string;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
}

export class CreateTeacherAssignmentDto {
  @ApiProperty() @IsUUID() teacherId!: string;
  @ApiProperty() @IsUUID() institutionId!: string;
  @ApiProperty() @IsUUID() scholarshipProgramId!: string;
}

export class AssignmentStatusDto {
  @ApiProperty({ description: 'false: gorevlendirme ve bagli dersler pasif olur' })
  @IsBoolean()
  isActive!: boolean;
}
