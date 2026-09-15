import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ALLOW_PENDING_PASSWORD_KEY } from './allow-pending-password.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthenticatedUser, JwtPayload } from './types';

/**
 * Global guard: tum endpoint'ler varsayilan olarak korumali, @Public() ile
 * hariç tutulur (ör. login, refresh). Gecici sifreyle giris yapan kullanici
 * sifresini degistirene kadar sadece @AllowPendingPassword() ile isaretli uclari kullanir.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Erisim jetonu eksik');

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token, { secret: process.env.JWT_ACCESS_SECRET });
    } catch {
      throw new UnauthorizedException('Gecersiz veya suresi dolmus jeton');
    }

    request.user = {
      userId: payload.sub,
      role: payload.role,
      institutionId: payload.institutionId,
      studentId: payload.sid ?? null,
      mustChangePassword: Boolean(payload.mcp),
    } satisfies AuthenticatedUser;

    if (
      payload.mcp &&
      !this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD_KEY, targets)
    ) {
      throw new ForbiddenException('Devam etmek icin once sifrenizi degistirin');
    }
    return true;
  }
}

function extractBearerToken(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}
