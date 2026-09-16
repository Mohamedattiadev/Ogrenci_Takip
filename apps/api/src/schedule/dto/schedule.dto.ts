import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsDateString,
  ValidateNested,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { ToBoolean, Trim } from '../../common/transforms';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Saat SS:DD biciminde olmali (ör. 18:00)';

export class ScheduleBreakDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
}

export class ScheduleQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() groupId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional({ description: '0 = Pazartesi ... 6 = Pazar' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive: boolean = true;
}

export class CreateScheduleDto {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ScheduleBreakDto)
  breaks?: ScheduleBreakDto[];
  @ApiProperty() @IsUUID() groupId!: string;
  @ApiProperty() @IsUUID() courseId!: string;
  @ApiProperty({
    description: 'Grup burs programliysa hoca o yurt+programa gorevlendirilmis olmali',
  })
  @IsUUID()
  teacherId!: string;
  @ApiProperty({ description: '0 = Pazartesi ... 6 = Pazar' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;
  @ApiProperty({ example: '18:00' }) @Matches(TIME, { message: TIME_MESSAGE }) startTime!: string;
  @ApiProperty({ example: '19:30' }) @Matches(TIME, { message: TIME_MESSAGE }) endTime!: string;
  @ApiPropertyOptional({ example: 'A-101' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  classroom?: string;
  @ApiPropertyOptional({
    default: 1,
    description: 'Bilgi amacli; haftada iki ders = iki ayri kayit',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weeklyFrequency?: number;
}

export class UpdateScheduleDto {
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ScheduleBreakDto)
  breaks?: ScheduleBreakDto[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(6) dayOfWeek?: number;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: TIME_MESSAGE }) startTime?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(TIME, { message: TIME_MESSAGE }) endTime?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  classroom?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(7) weeklyFrequency?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
