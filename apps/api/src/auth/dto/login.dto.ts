import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'hoca1@example.invalid' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(6) @MaxLength(128) currentPassword!: string;

  @ApiProperty({ description: 'En az 8 karakter' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
