import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { ToNumberArray, Trim } from '../../common/transforms';

export class GroupQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() termId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() scholarshipProgramId?: string;
}

export class CreateGroupDto {
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi icin zorunlu' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiProperty() @IsUUID() termId!: string;
  @ApiProperty({ example: 'İlahiyat Akademi - A Grubu' })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ description: 'Bos ise grupta farkli programlardan ogrenci olabilir' })
  @IsOptional()
  @IsUUID()
  scholarshipProgramId?: string;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Grup acilirken bu siniflardaki (0 = hazirlik) uygun aktif ogrenciler otomatik eklenir',
  })
  @IsOptional()
  @ToNumberArray()
  @IsArray()
  @ArrayMaxSize(11)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(10, { each: true })
  autoEnrollUniversityYears?: number[];
}

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;
  @ApiPropertyOptional({ description: 'Uyelik/ders gecmisi olan grupta degistirilemez' })
  @IsOptional()
  @IsUUID()
  termId?: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Uyelik/ders gecmisi olan grupta degistirilemez',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  scholarshipProgramId?: string | null;
}

export class MembersQueryDto {
  @ApiPropertyOptional({ description: 'Bu gunde grupta olanlar; bos ise bugun' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AddMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  studentIds!: string[];

  @ApiProperty({ example: '2026-10-01' }) @IsDateString() effectiveFrom!: string;
}

export class EndMembershipQueryDto {
  @ApiPropertyOptional({ description: 'Gruptaki son gun + 1 (bos ise bugun)' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
