import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@yoklama/db';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination';
import { ToBoolean, Trim } from '../../common/transforms';

const lowerEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class UserQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsUUID() institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
}

export class CreateUserDto {
  @ApiProperty() @lowerEmail() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ description: 'En az 8 karakter' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role!: UserRole;
  @ApiPropertyOptional({
    description: 'Hocanin/yoneticinin bagli oldugu yurt. Sadece sistem yoneticisi secer.',
  })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @lowerEmail() @IsEmail() @MaxLength(254) email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional({ description: 'Sadece sistem yoneticisi' })
  @IsOptional()
  @IsUUID()
  institutionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetPasswordDto {
  @ApiProperty({ description: 'En az 8 karakter' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
