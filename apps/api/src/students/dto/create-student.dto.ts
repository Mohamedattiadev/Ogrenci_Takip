import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
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
