import { UserRole } from '@yoklama/db';
import type { TenantContext } from '@yoklama/db';

export interface JwtPayload {
  sub: string; // userId
  role: UserRole;
  institutionId: string | null;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  institutionId: string | null;
}

export function toTenantContext(user: AuthenticatedUser): TenantContext {
  return {
    actorId: user.userId,
    institutionId: user.institutionId,
    isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
  };
}
