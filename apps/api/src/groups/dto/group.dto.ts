import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  termId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

export class AssignMembershipDto {
  @ApiProperty()
  @IsString()
  studentId!: string;

  @ApiProperty()
  @IsString()
  groupId!: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;
}
