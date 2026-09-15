import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowPendingPassword } from './allow-pending-password.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto, LoginDto, RefreshDto } from './dto/login.dto';
import { Public } from './public.decorator';
import type { AuthenticatedUser } from './types';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** E-posta (personel) veya kullanici adi (ogrenci). Kaba kuvvete karsi dakikada 10 deneme. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @AllowPendingPassword()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  /** Yeni jeton cifti doner (eski oturumlar kapanir, gecici sifre isareti kalkar). */
  @ApiBearerAuth()
  @AllowPendingPassword()
  @Patch('me/password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto.currentPassword, dto.newPassword);
  }
}
