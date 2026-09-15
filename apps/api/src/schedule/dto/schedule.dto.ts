import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty() @IsString() groupId!: string;
  @ApiProperty() @IsString() courseId!: string;
  @ApiProperty() @IsString() teacherId!: string;
  @ApiProperty({ description: '0=Pazartesi ... 6=Pazar' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;
  @ApiProperty({ example: '18:00' }) @IsString() startTime!: string;
  @ApiProperty({ example: '19:30' }) @IsString() endTime!: string;
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() weeklyFrequency?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() classroom?: string;
}

export class GenerateOccurrencesDto {
  @ApiProperty() @IsDateString() from!: string;
  @ApiProperty() @IsDateString() to!: string;
}

export class CancelOccurrenceDto {
  @ApiProperty() @IsString() reason!: string;
}

export class CreateHolidayDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ required: false, description: 'Bos ise tum kurumlar icin gecerli (resmi tatil)' })
  @IsOptional()
  @IsBoolean()
  allInstitutions?: boolean;
}
