import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const REPORT_FORMATS = ['json', 'csv', 'pdf'] as const;
export type ReportOutput = (typeof REPORT_FORMATS)[number];

/** Aylik/donemlik/yillik raporlar ayni uc noktadan tarih araligiyla alinir. */
export class ReportQueryDto {
  @ApiProperty({ example: '2026-10-01' }) @IsDateString() from!: string;
  @ApiProperty({ example: '2026-10-31' }) @IsDateString() to!: string;
  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: 'json' })
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format: ReportOutput = 'json';
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scholarshipProgramId?: string;
}

export class TopAbsenteesQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 20;
}
