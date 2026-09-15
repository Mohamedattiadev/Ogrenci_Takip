import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@yoklama/db';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { ToBoolean, Trim } from '../../common/transforms';

export class InstitutionQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
}

export class CreateInstitutionDto {
  @ApiProperty({ example: 'TDV Erkek Öğrenci Yurdu Ankara' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ANK-ERKEK-1', description: 'Buyuk harf, rakam ve tire' })
  @Trim()
  @IsString()
  @Matches(/^[A-Z0-9-]{2,30}$/, { message: 'Kod buyuk harf, rakam ve tireden olusmali (2-30)' })
  code!: string;

  @ApiPropertyOptional({ enum: Gender, description: 'Yurttaki ogrencilerin cinsiyeti' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

export class UpdateInstitutionDto extends PartialType(CreateInstitutionDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
