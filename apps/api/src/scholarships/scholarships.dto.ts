import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateScholarshipDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty() @IsString() @MinLength(2) name!: string;
}

export class CreateTeacherAssignmentDto {
  @ApiProperty() @IsUUID() teacherId!: string;
  @ApiProperty() @IsUUID() institutionId!: string;
  @ApiProperty() @IsUUID() scholarshipProgramId!: string;
}

export class AssignmentStatusDto {
  @ApiProperty() @IsBoolean() isActive!: boolean;
}
