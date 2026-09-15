import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Gender } from '@yoklama/db';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ enum: Gender, required: false }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiProperty()
  @IsString()
  studentNumber!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() university?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() department?: string;
  @ApiProperty({ required: false, description: '0 = hazirlik' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  universityYear?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() scholarshipProgramId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guardianEmail?: string;

  @ApiProperty()
  @IsDateString()
  enrollDate!: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
