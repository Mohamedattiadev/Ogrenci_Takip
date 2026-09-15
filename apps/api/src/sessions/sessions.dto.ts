import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@yoklama/db';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { ToBoolean, Trim } from '../common/transforms';

export const SESSION_STATUSES = ['all', 'upcoming', 'past', 'cancelled'] as const;
export const ATTENDANCE_FILTERS = ['taken', 'missing'] as const;

export class SessionQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ example: '2026-10-31' }) @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string;
  @ApiPropertyOptional({ enum: SESSION_STATUSES, default: 'all' })
  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status: (typeof SESSION_STATUSES)[number] = 'all';
  @ApiPropertyOptional({
    enum: ATTENDANCE_FILTERS,
    description: 'missing: bugune kadar yoklamasi girilmemis',
  })
  @IsOptional()
  @IsIn(ATTENDANCE_FILTERS)
  attendance?: (typeof ATTENDANCE_FILTERS)[number];
}

export class TodayQueryDto {
  @ApiPropertyOptional({ description: 'Bos ise bugun (Turkiye saati)' })
  @IsOptional()
  @IsDateString()
  date?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional({ description: 'Yoneticiler icin; hoca her zaman kendi derslerini gorur' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}

export class GenerateSessionsDto {
  @ApiProperty({ example: '2026-10-01' }) @IsDateString() from!: string;
  @ApiProperty({ example: '2027-06-30' }) @IsDateString() to!: string;
  @ApiPropertyOptional({ description: 'Tek bir ders programi icin' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;
  @ApiPropertyOptional({ description: 'Sistem yoneticisi icin yurt filtresi' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}

export class CreateMakeupDto {
  @ApiProperty() @IsUUID() scheduleId!: string;
  @ApiProperty({ example: '2026-11-08' }) @IsDateString() date!: string;
}

export class CancelSessionDto {
  @ApiProperty({ example: 'Hoca raporlu' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  reason!: string;
}

export class AttendanceEntryDto {
  @ApiProperty() @IsUUID() studentId!: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Trim() @IsString() @MaxLength(300) note?:
    string | null;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class AllPresentQueryDto {
  @ApiPropertyOptional({ default: false, description: 'true: mevcut isaretlemelerin ustune yazar' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  overwrite: boolean = false;
}

export class ScanQrDto {
  @ApiProperty({ description: 'Ogrenci kartindaki QR kodun icerigi' })
  @IsString()
  @MaxLength(2000)
  token!: string;
}
