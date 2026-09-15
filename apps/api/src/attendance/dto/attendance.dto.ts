import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '@yoklama/db';

export class AttendanceEntryDto {
  @ApiProperty() @IsString() studentId!: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

export class MarkAttendanceDto {
  @ApiProperty() @IsString() sessionOccurrenceId!: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class ScanQrDto {
  @ApiProperty() @IsString() sessionOccurrenceId!: string;
  @ApiProperty({ description: 'Ogrenci kartindaki QR kodun icerigi' }) @IsString() token!: string;
}

export class UpdateAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}
