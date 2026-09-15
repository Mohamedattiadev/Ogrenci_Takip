import type { Prisma, PrismaClient } from '@yoklama/db';

/**
 * Aktif grup uyeliklerini verilen tarihte kapatir. Uyelik o tarihten sonra basladiysa
 * baslangic gunuyle kapatilir (effectiveTo >= effectiveFrom veritabani kurali).
 * Gecmis korunur: satirlar silinmez.
 */
export async function closeMemberships(
  tx: PrismaClient,
  where: Prisma.GroupMembershipWhereInput,
  date: Date,
): Promise<number> {
  const active = await tx.groupMembership.findMany({
    where: { ...where, effectiveTo: null },
    select: { id: true, effectiveFrom: true },
  });
  for (const membership of active) {
    await tx.groupMembership.update({
      where: { id: membership.id },
      data: { effectiveTo: membership.effectiveFrom > date ? membership.effectiveFrom : date },
    });
  }
  return active.length;
}

/** Belirli bir gunde gruba kayitli olanlar: effectiveFrom <= gun < effectiveTo. */
export function membershipAt(date: Date): Prisma.GroupMembershipWhereInput {
  return {
    effectiveFrom: { lte: date },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: date } }],
  };
}
