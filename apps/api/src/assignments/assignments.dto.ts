import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { Trim } from '../common/transforms';

export const ASSIGNMENT_STATUSES = ['all', 'open', 'closed'] as const;

export class AssignmentListQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scheduleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional({
    enum: ASSIGNMENT_STATUSES,
    default: 'all',
    description: 'open: teslim tarihi gecmemis',
  })
  @IsOptional()
  @IsIn(ASSIGNMENT_STATUSES)
  status: (typeof ASSIGNMENT_STATUSES)[number] = 'all';
}

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Odevin verildigi ders (grup + ders + hoca)' })
  @IsUUID()
  scheduleId!: string;
  @ApiProperty({ example: 'Hadis usulü özet' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional({ example: '2026-10-20T20:59:00.000Z', description: 'Bos ise suresiz' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() allowText?: boolean;
  @ApiPropertyOptional({ default: true, description: 'PDF, en fazla 10 MB' })
  @IsOptional()
  @IsBoolean()
  allowFile?: boolean;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Trim()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  dueAt?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowText?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowFile?: boolean;
}
