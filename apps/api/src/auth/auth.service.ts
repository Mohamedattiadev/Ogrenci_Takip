import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { prisma, UserRole } from '@yoklama/db';
import type { JwtPayload } from './types';

interface AuthLookupRow {
  id: string;
  passwordHash: string;
  role: UserRole;
  institutionId: string | null;
  isActive: boolean;
}

function parseDurationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 15 * 60_000;
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit!]!;
  return amount * unitMs;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    // Login aninda henuz kurum/RLS context'i bilinmiyor - dar kapsamli bir
    // SECURITY DEFINER fonksiyonuyla kullanici bulunuyor (bkz. rls-policies.sql).
    const rows = await prisma.$queryRaw<AuthLookupRow[]>`
      SELECT * FROM app_auth_lookup(${email})
    `;
    const user = rows[0];
    if (!user || !user.isActive) throw new UnauthorizedException('Gecersiz e-posta veya sifre');

    const valid = await compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Gecersiz e-posta veya sifre');

    return this.issueTokens({
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId,
    });
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Gecersiz yenileme jetonu');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedException('Yenileme jetonu gecersiz veya iptal edilmis');
    }
    const matches = await compare(refreshToken, stored.tokenHash);
    if (!matches) throw new UnauthorizedException('Yenileme jetonu gecersiz');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId,
    });
  }

  async logout(refreshTokenId: string) {
    await prisma.refreshToken.updateMany({
      where: { id: refreshTokenId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: {
    userId: string;
    role: UserRole;
    institutionId: string | null;
  }) {
    const accessPayload: JwtPayload = {
      sub: user.userId,
      role: user.role,
      institutionId: user.institutionId,
    };
    const accessToken = this.jwt.sign(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });

    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.userId, jti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL ?? '30d' },
    );
    const tokenHash = await hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(process.env.JWT_REFRESH_TTL ?? '30d'),
    );
    await prisma.refreshToken.create({
      data: { id: jti, userId: user.userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.userId, role: user.role, institutionId: user.institutionId },
    };
  }
}
