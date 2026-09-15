import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Gender } from '@yoklama/db';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { Trim } from '../../common/transforms';

const PHONE = /^[0-9+() -]{7,20}$/;

export const STUDENT_STATUSES = ['active', 'withdrawn', 'all'] as const;
export const STUDENT_SORTS = ['name', 'studentNumber', 'enrollDate', 'createdAt'] as const;
export const EXPORT_FORMATS = ['csv', 'excel', 'pdf'] as const;

export class StudentQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scholarshipProgramId?: string;
  @ApiPropertyOptional({ description: 'Grupta su an aktif olanlar' })
  @IsOptional()
  @IsUUID()
  groupId?: string;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional({ description: '0 = hazirlik' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  universityYear?: number;
  @ApiPropertyOptional({ enum: STUDENT_STATUSES, default: 'active' })
  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status: (typeof STUDENT_STATUSES)[number] = 'active';
  @ApiPropertyOptional({ enum: STUDENT_SORTS, default: 'name' })
  @IsOptional()
  @IsIn(STUDENT_SORTS)
  sort: (typeof STUDENT_SORTS)[number] = 'name';
}

export class StudentExportQueryDto extends StudentQueryDto {
  @ApiProperty({ enum: EXPORT_FORMATS })
  @IsIn(EXPORT_FORMATS)
  format!: (typeof EXPORT_FORMATS)[number];
}

export class CreateStudentDto {
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiProperty() @Trim() @IsString() @MinLength(1) @MaxLength(30) studentNumber!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(60) firstName!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(60) lastName!: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Cinsiyeti tanimli yurtta zorunlu' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional() @IsOptional() @Trim() @Matches(PHONE) phone?: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(120) university?: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(120) department?: string;

  @ApiPropertyOptional({ description: '0 = hazirlik' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  universityYear?: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() scholarshipProgramId?: string;

  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(120) guardianName?: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @Matches(PHONE) guardianPhone?: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @IsEmail() guardianEmail?: string;

  @ApiProperty({ example: '2026-10-01' }) @IsDateString() enrollDate!: string;
}

export class UpdateStudentDto extends PartialType(OmitType(CreateStudentDto, ['institutionId'])) {}

export class WithdrawStudentDto {
  @ApiPropertyOptional({ description: 'Bos ise bugun' })
  @IsOptional()
  @IsDateString()
  withdrawDate?: string;
}

export class GroupTransferDto {
  @ApiProperty() @IsUUID() fromGroupId!: string;
  @ApiProperty() @IsUUID() toGroupId!: string;
  @ApiProperty({ example: '2026-11-01', description: 'Yeni grupta ilk gun' })
  @IsDateString()
  effectiveDate!: string;
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ example: '2027-06-30' }) @IsOptional() @IsDateString() to?: string;
}

export class ImportQueryDto {
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
