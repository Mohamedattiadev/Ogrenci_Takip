import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@yoklama/db';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(6) password!: string;
  @ApiProperty() @IsString() @MinLength(2) fullName!: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role!: UserRole;
  @ApiProperty({ required: false, description: 'Sadece SUPER_ADMIN baska bir kurum secebilir' })
  @IsOptional()
  @IsString()
  institutionId?: string;
}
