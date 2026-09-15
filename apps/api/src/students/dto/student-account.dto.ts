import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const USERNAME = /^[a-z0-9._-]{3,40}$/;

export class CreateStudentAccountDto {
  @ApiPropertyOptional({ description: 'Bos ise ogrenci numarasi (kucuk harfle) kullanilir' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @Matches(USERNAME, {
    message: 'Kullanici adi 3-40 karakter olmali; harf, rakam, nokta, tire ve alt cizgi icerebilir',
  })
  username?: string;

  @ApiProperty({ description: 'Gecici sifre (en az 8 karakter). Ogrenci ilk giriste degistirir.' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class UpdateStudentAccountDto {
  @ApiPropertyOptional({ description: 'Yeni gecici sifre; ogrenci ilk giriste yine degistirir' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ description: 'false: ogrenci giris yapamaz' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
