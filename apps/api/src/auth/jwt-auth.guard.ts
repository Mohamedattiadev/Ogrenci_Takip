import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { JwtPayload } from './types';

/**
 * Global guard: tum endpoint'ler varsayilan olarak korumali, @Public() ile
 * hariç tutulur (ör. login, refresh). Referans projedeki AuthGuard desenine
 * benzer ama tek bir JWT tipimiz oldugu icin daha basit.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException('Erisim jetonu eksik');

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      request.user = {
        userId: payload.sub,
        role: payload.role,
        institutionId: payload.institutionId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Gecersiz veya suresi dolmus jeton');
    }
  }
}

function extractBearerToken(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}
