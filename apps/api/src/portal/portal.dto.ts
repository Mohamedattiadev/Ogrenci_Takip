import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ToBoolean, Trim } from '../common/transforms';

const PHONE = /^[0-9+() -]{7,20}$/;

/** Ogrencinin degistirebildigi alanlar. Ogrenci no, yurt, program, cinsiyet, gruplar kilitli. */
export class UpdateOwnProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Trim() @Matches(PHONE) phone?:
    string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  university?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  department?: string | null;
  @ApiPropertyOptional({ nullable: true, description: '0 = hazirlik' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  universityYear?: number | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  guardianName?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Trim() @Matches(PHONE) guardianPhone?:
    string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Trim() @IsEmail() guardianEmail?:
    string | null;
}

export class PortalAttendanceQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ example: '2027-06-30' }) @IsOptional() @IsDateString() to?: string;
}

/** multipart/form-data: text (istege bagli), file (PDF, istege bagli), removeFile. */
export class SubmissionDto {
  @ApiPropertyOptional({ description: 'Metin cevap; bos gonderilirse metin silinir' })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  text?: string;

  @ApiPropertyOptional({ description: 'true: onceden yuklenen PDF kaldirilir' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  removeFile?: boolean;
}
