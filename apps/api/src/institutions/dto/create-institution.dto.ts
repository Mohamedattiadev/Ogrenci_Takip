import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreateInstitutionDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ description: 'Kisa kurum kodu, ör. YURT-ANKARA-01' })
  @IsString()
  @Matches(/^[A-Z0-9-]{2,32}$/, { message: 'Kod sadece buyuk harf, rakam ve tire icerebilir' })
  code!: string;
}
