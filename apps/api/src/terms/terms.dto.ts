import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PageQueryDto } from '../common/pagination';

export class TermQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Yurt filtresi' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}

export class CreateTermDto {
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiProperty({ example: '2026-2027' }) @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @ApiProperty({ example: '2026-10-01' }) @IsDateString() startDate!: string;
  @ApiProperty({ example: '2027-06-30' }) @IsDateString() endDate!: string;
}

export class UpdateTermDto extends PartialType(OmitType(CreateTermDto, ['institutionId'])) {}
