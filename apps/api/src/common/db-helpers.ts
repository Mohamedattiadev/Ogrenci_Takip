import { StreamableFile } from '@nestjs/common';
import type { PrismaClient } from '@yoklama/db';
import type { Response } from 'express';

/** Tetikleyici/kisit mesajini Prisma hata metninden cikarir; baglanti bilgisi dondurmez. */
export function databaseReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Unique constraint')) return 'bu bilgilerle bir kayit zaten var';
  return (
    /(?:message: \\?"|ERROR: )([^"\\\n`]+)/.exec(message)?.[1]?.trim() ??
    'veritabani kaydi reddetti'
  );
}

type SavepointResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Toplu islemlerde her ogeyi kendi SAVEPOINT'inde calistirir: bir ogeyi veritabani
 * kurali reddederse sadece o oge geri alinir, transaction'in geri kalani devam eder.
 * (withTenant zaten bir transaction acar; Prisma icinde ic ice $transaction acilamaz.)
 */
export async function withSavepoint<T>(
  tx: PrismaClient,
  fn: () => Promise<T>,
): Promise<SavepointResult<T>> {
  await tx.$executeRawUnsafe('SAVEPOINT bulk_item');
  try {
    const value = await fn();
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT bulk_item');
    return { ok: true, value };
  } catch (error) {
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT bulk_item');
    return { ok: false, reason: databaseReason(error) };
  }
}

/** Dosya indirme yaniti; Turkce dosya adlari icin RFC 5987 filename* eklenir. */
export function fileResponse(
  res: Response,
  buffer: Buffer | Uint8Array,
  filename: string,
  contentType: string,
) {
  const ascii = filename
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/"/g, '');
  res.set({
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return new StreamableFile(Buffer.from(buffer));
}
