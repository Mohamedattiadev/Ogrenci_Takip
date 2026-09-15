import { UserRole } from '@yoklama/db';
import type { TenantContext } from '@yoklama/db';

export interface JwtPayload {
  sub: string; // userId
  role: UserRole;
  institutionId: string | null;
  /** Ogrenci hesabinda bagli ogrenci kaydi. */
  sid?: string;
  /** Gecici sifreyle girildi: sifre degisene kadar sadece izinli uc noktalar. */
  mcp?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  institutionId: string | null;
  studentId?: string | null;
  mustChangePassword?: boolean;
}

export function toTenantContext(user: AuthenticatedUser): TenantContext {
  return {
    actorId: user.userId,
    institutionId: user.institutionId,
    isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
  };
}
