import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Gender } from '@yoklama/db';

export class CreateInstitutionDto {
  @ApiProperty({ enum: Gender, required: false }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ description: 'Kisa kurum kodu, ör. YURT-ANKARA-01' })
  @IsString()
  @Matches(/^[A-Z0-9-]{2,32}$/, { message: 'Kod sadece buyuk harf, rakam ve tire icerebilir' })
  code!: string;
}
