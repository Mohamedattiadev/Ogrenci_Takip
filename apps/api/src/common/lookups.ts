import type { PrismaClient } from '@yoklama/db';

/**
 * RLS bazi iliskili satirlari gizleyebilir (ör. hoca, duzeltmeyi yapan yoneticiyi goremez).
 * Prisma `include` zorunlu bir iliski gizlendiginde hata verir; bu yuzden kullanici ve
 * yurt adlari ayri sorguyla, gorunenler uzerinden eslenir. Gorunmeyen ad `null` doner.
 */
export async function userNames(tx: PrismaClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await tx.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, fullName: true },
  });
  return new Map(users.map((user) => [user.id, user.fullName]));
}

export async function institutionNames(tx: PrismaClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map<string, string>();
  const institutions = await tx.institution.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(institutions.map((institution) => [institution.id, institution.name]));
}

export function ref(id: string | null | undefined, names: Map<string, string>) {
  return id ? { id, name: names.get(id) ?? null } : null;
}
