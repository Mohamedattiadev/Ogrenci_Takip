import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

export const prisma = new PrismaClient();

export interface TenantContext {
  institutionId: string | null; // SUPER_ADMIN icin null
  actorId: string;
  isSuperAdmin: boolean;
}

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/**
 * Her istegi Postgres RLS'in gorebilecegi bir transaction'a sarar.
 * SET LOCAL sadece bu transaction'a ozeldir; pool'daki bir baglanti
 * asla farkli bir kurumun context'ini "miras alamaz".
 *
 * Butun repository/servis metotlari bu fonksiyon uzerinden calismalidir -
 * dogrudan `prisma.student.findMany()` gibi cagrilar RLS context'i olmadan
 * (varsayilan olarak hicbir satir gormeyecek sekilde) calisir.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (ctx.institutionId !== null && !UUID_RE.test(ctx.institutionId)) {
    throw new Error('Gecersiz institutionId');
  }
  if (!UUID_RE.test(ctx.actorId)) {
    throw new Error('Gecersiz actorId');
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.institution_id = '${ctx.institutionId ?? ''}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.actor_id = '${ctx.actorId}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = '${ctx.isSuperAdmin}'`);
      return fn(tx as unknown as PrismaClient);
    },
    // Varsayilan (2sn baglanti bekleme, 5sn islem suresi) barindirilan bir havuzlayiciya
    // (ornegin Supabase pooler) uzak baglanti gecikmesiyle sik sik yetersiz kaliyor;
    // ozellikle birden fazla sorgu iceren islemler (ör. topluca ogrenci ekleme) icin yukseltildi.
    { maxWait: 10_000, timeout: 20_000 },
  );
}
