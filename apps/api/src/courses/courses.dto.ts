import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { Trim } from '../common/transforms';

export class CourseQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
}

export class CreateCourseDto {
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiProperty({ example: 'Temel İslami İlimler' })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

export class UpdateCourseDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1) @MaxLength(100) name!: string;
}
