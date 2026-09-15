import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination';
import { Trim } from '../common/transforms';

export class HolidayQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Bu yurda ait + tum yurtlara gecerli tatiller' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-10-29' }) @IsDateString() date!: string;

  @ApiProperty({ example: 'Cumhuriyet Bayramı' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @ApiPropertyOptional({ description: 'true: tum yurtlar (resmi tatil, sadece sistem yoneticisi)' })
  @IsOptional()
  @IsBoolean()
  allInstitutions?: boolean;

  @ApiPropertyOptional({ description: 'Yurda ozel tatil; sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
