import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { withTenant, type TenantContext } from '@yoklama/db';
import type { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';
import { parseStudentSheet, type SheetRow } from './student-import';

@Injectable()
export class StudentsService {
  create(ctx: TenantContext, dto: CreateStudentDto) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    return withTenant(ctx, (tx) =>
      tx.student.create({
        data: { ...dto, enrollDate: new Date(dto.enrollDate), institutionId: ctx.institutionId! },
      }),
    );
  }

  findAll(ctx: TenantContext, search?: string) {
    return withTenant(ctx, (tx) =>
      tx.student.findMany({
        where: {
          deletedAt: null,
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { studentNumber: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    );
  }

  findOne(ctx: TenantContext, id: string) {
    return withTenant(ctx, (tx) => tx.student.findFirstOrThrow({ where: { id, deletedAt: null } }));
  }

  update(ctx: TenantContext, id: string, dto: UpdateStudentDto) {
    return withTenant(ctx, (tx) =>
      tx.student.update({
        where: { id },
        data: { ...dto, ...(dto.enrollDate ? { enrollDate: new Date(dto.enrollDate) } : {}) },
      }),
    );
  }

  remove(ctx: TenantContext, id: string) {
    // Sert silme yok: yoklama gecmisi ogrenci "ayrilsa" bile korunmali.
    return withTenant(ctx, (tx) =>
      tx.student.update({
        where: { id },
        data: { deletedAt: new Date(), withdrawDate: new Date() },
      }),
    );
  }

  /**
   * Excel'den toplu ogrenci aktarimi. Ilk satir baslik; sutunlar basliga gore okunur
   * (sira onemsiz, bkz. student-import.ts):
   * Ogrenci No | Ad | Soyad | Cinsiyet (K/E) | Burs Programi (kod veya ad) | Universite |
   * Bolum | Sinif (Hazirlik/0-10) | Telefon | Veli Adi | Veli Telefon | Veli E-posta |
   * Kayit Tarihi (YYYY-MM-DD veya GG.AA.YYYY). Cinsiyeti tanimli yurtta Cinsiyet zorunludur.
   */
  async importFromExcel(ctx: TenantContext, buffer: Buffer) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { imported: 0, errors: ['Sayfa bulunamadi'] };

    const sheet: SheetRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      sheet.push({ rowNumber, values: (row.values as unknown[]).slice(1) });
    });

    // Not: withTenant zaten bir transaction icinde calisir (RLS SET LOCAL icin sart) -
    // Prisma'nin interaktif transaction client'i icinde ikinci bir $transaction acilamaz.
    // Her satir kendi SAVEPOINT'inde yazilir: veritabani kurali bir satiri reddederse
    // sadece o satir geri alinir, digerleri aktarilir.
    return withTenant(ctx, async (tx) => {
      const institution = await tx.institution.findUniqueOrThrow({
        where: { id: ctx.institutionId! },
        select: { gender: true },
      });
      const programs = await tx.scholarshipProgram.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
      });
      const { students, errors } = parseStudentSheet(sheet, programs, institution.gender);

      let imported = 0;
      for (const { rowNumber, ...student } of students) {
        await tx.$executeRawUnsafe('SAVEPOINT student_import_row');
        try {
          // institutionId+studentNumber icin Prisma @@unique yok (sadece aktif kayitlar
          // arasinda raw SQL partial unique index var), bu yuzden upsert yerine bul-sonra-yaz.
          const existing = await tx.student.findFirst({
            where: {
              institutionId: ctx.institutionId!,
              studentNumber: student.studentNumber,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (existing) {
            await tx.student.update({
              where: { id: existing.id },
              data: { ...student, studentNumber: undefined, enrollDate: undefined },
            });
          } else {
            await tx.student.create({ data: { ...student, institutionId: ctx.institutionId! } });
          }
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT student_import_row');
          imported++;
        } catch (error) {
          await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT student_import_row');
          errors.push(`Satir ${rowNumber}: ${databaseReason(error)}`);
        }
      }
      return { imported, errors };
    });
  }
}

/** Tetikleyici/kisit mesajini Prisma hata metninden cikarir; baglanti bilgisi dondurmez. */
function databaseReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const match = /(?:message: \\?"|ERROR: )([^"\\\n`]+)/.exec(message);
  return match?.[1]?.trim() ?? 'veritabani kaydi reddetti';
}
