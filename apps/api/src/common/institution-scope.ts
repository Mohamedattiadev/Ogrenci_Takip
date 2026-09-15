import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@yoklama/db';
import type { AuthenticatedUser } from '../auth/types';

/**
 * Yazma islemlerinde kaydin ait olacagi yurt.
 * - Sistem yoneticisi hedef yurdu acikca secer (`institutionId` zorunlu).
 * - Yurt yoneticisi yalnizca kendi yurduna yazar; baska yurt istemek 403'tur.
 * Veri izolasyonunun asil garantisi yine Postgres RLS'tir; bu kontrol anlasilir hata verir.
 */
export function targetInstitution(user: AuthenticatedUser, requested?: string | null): string {
  if (user.role === UserRole.SUPER_ADMIN) {
    if (!requested) throw new BadRequestException('Sistem yoneticisi icin institutionId zorunlu');
    return requested;
  }
  if (!user.institutionId) throw new ForbiddenException('Kullanici bir yurda bagli degil');
  if (requested && requested !== user.institutionId) {
    throw new ForbiddenException('Baska bir yurt adina islem yapilamaz');
  }
  return user.institutionId;
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.INSTITUTION_ADMIN;
}
