import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { prisma, UserRole, withTenant, type TenantContext } from '@yoklama/db';
import { institutionNames, ref } from '../common/lookups';
import { toTenantContext, type AuthenticatedUser, type JwtPayload } from './types';

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

/** Yenileme jetonu kendi kullanicisinin adina islem yapar; kurum/rol bilgisi gerekmez. */
function selfContext(userId: string): TenantContext {
  return { actorId: userId, institutionId: null, isSuperAdmin: false };
}

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  /** Personel e-postasiyla, ogrenci kullanici adiyla giris yapar. */
  async login(identifier: string, password: string) {
    // Login aninda henuz kurum/RLS context'i bilinmiyor - dar kapsamli bir
    // SECURITY DEFINER fonksiyonuyla kullanici bulunuyor (bkz. rls-policies.sql).
    const rows = await prisma.$queryRaw<AuthLookupRow[]>`
      SELECT * FROM app_auth_lookup(${identifier.trim().toLowerCase()})
    `;
    const user = rows[0];
    if (!user || !user.isActive)
      throw new UnauthorizedException('Gecersiz kullanici bilgisi veya sifre');

    const valid = await compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Gecersiz kullanici bilgisi veya sifre');

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefresh(refreshToken);
    const ctx = selfContext(payload.sub);
    const stored = await withTenant(ctx, (tx) =>
      tx.refreshToken.findUnique({ where: { id: payload.jti } }),
    );
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

    // Silinen/ayrilan ogrencinin hesabi veritabani tetikleyicisiyle pasiflesir ve oturumlari iptal edilir.
    const user = await withTenant(ctx, (tx) =>
      tx.user.findUniqueOrThrow({ where: { id: stored.userId } }),
    );
    if (!user.isActive || user.deletedAt) throw new UnauthorizedException('Kullanici aktif degil');
    // Jeton rotasyonu: kullanilan yenileme jetonu tek kullanimlik.
    await withTenant(ctx, (tx) =>
      tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    );

    return this.issueTokens(user.id);
  }

  /** Erisim jetonu suresi dolmus olsa bile cikis yapilabilsin diye yenileme jetonuyla calisir. */
  async logout(refreshToken: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = this.verifyRefresh(refreshToken);
    } catch {
      return; // Gecersiz/suresi dolmus jeton zaten kullanilamaz; cikis basarili sayilir.
    }
    await withTenant(selfContext(payload.sub), (tx) =>
      tx.refreshToken.updateMany({
        where: { id: payload.jti, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    );
  }

  me(user: AuthenticatedUser) {
    return withTenant(toTenantContext(user), async (tx) => {
      const profile = await tx.user.findUniqueOrThrow({
        where: { id: user.userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          username: true,
          role: true,
          institutionId: true,
          isActive: true,
          mustChangePassword: true,
          studentId: true,
          createdAt: true,
          assignments: {
            where: { isActive: true },
            select: { id: true, institutionId: true, scholarshipProgram: true },
          },
        },
      });
      const names = await institutionNames(tx, [
        profile.institutionId,
        ...profile.assignments.map((a) => a.institutionId),
      ]);
      return {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        username: profile.username,
        role: profile.role,
        isActive: profile.isActive,
        mustChangePassword: profile.mustChangePassword,
        studentId: profile.studentId,
        createdAt: profile.createdAt,
        institution: ref(profile.institutionId, names),
        assignments: profile.assignments.map((a) => ({
          id: a.id,
          institution: ref(a.institutionId, names),
          scholarshipProgram: {
            id: a.scholarshipProgram.id,
            code: a.scholarshipProgram.code,
            name: a.scholarshipProgram.name,
          },
        })),
      };
    });
  }

  /**
   * Sifre degisince tum eski oturumlar kapatilir ve yeni jeton cifti doner; ilk giris
   * (gecici sifre) isareti de kalkar, kullanici kaldigi yerden devam eder.
   */
  async changePassword(user: AuthenticatedUser, currentPassword: string, newPassword: string) {
    if (currentPassword === newPassword) {
      throw new BadRequestException('Yeni sifre mevcut sifreden farkli olmali');
    }
    const ctx = selfContext(user.userId);
    const current = await withTenant(ctx, (tx) =>
      tx.user.findUniqueOrThrow({ where: { id: user.userId }, select: { passwordHash: true } }),
    );
    if (!(await compare(currentPassword, current.passwordHash))) {
      throw new UnauthorizedException('Mevcut sifre hatali');
    }
    const passwordHash = await hash(newPassword, 10);
    await withTenant(ctx, async (tx) => {
      // Kullanici kendi satirinda sadece sifresini degistirebilir (SECURITY DEFINER fonksiyon).
      await tx.$executeRaw`SELECT app_set_own_password(${passwordHash})`;
      await tx.refreshToken.updateMany({
        where: { userId: user.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return this.issueTokens(user.userId);
  }

  private verifyRefresh(refreshToken: string): { sub: string; jti: string } {
    try {
      return this.jwt.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Gecersiz yenileme jetonu');
    }
  }

  private async issueTokens(userId: string) {
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, jti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL ?? '30d' },
    );
    const tokenHash = await hash(refreshToken, 10);
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(process.env.JWT_REFRESH_TTL ?? '30d'),
    );
    const profile = await withTenant(selfContext(userId), async (tx) => {
      await tx.refreshToken.create({ data: { id: jti, userId, tokenHash, expiresAt } });
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          role: true,
          institutionId: true,
          fullName: true,
          email: true,
          username: true,
          mustChangePassword: true,
          studentId: true,
        },
      });
    });

    const accessPayload: JwtPayload = {
      sub: userId,
      role: profile.role,
      institutionId: profile.institutionId,
      ...(profile.studentId ? { sid: profile.studentId } : {}),
      ...(profile.mustChangePassword ? { mcp: true } : {}),
    };
    const accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
    const accessToken = this.jwt.sign(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: accessTtl,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.round(parseDurationToMs(accessTtl) / 1000),
      user: {
        id: userId,
        role: profile.role,
        institutionId: profile.institutionId,
        fullName: profile.fullName,
        email: profile.email,
        username: profile.username,
        studentId: profile.studentId,
        mustChangePassword: profile.mustChangePassword,
      },
    };
  }
}
