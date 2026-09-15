import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { withTenant, type TenantContext } from '@yoklama/db';
import type { CreateStudentDto, UpdateStudentDto } from './dto/create-student.dto';

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
   * Excel'den toplu ogrenci aktarimi. Beklenen kolonlar (ilk satir baslik):
   * Ogrenci No | Ad | Soyad | Veli Adi | Veli Telefon | Veli E-posta | Kayit Tarihi (YYYY-MM-DD)
   */
  async importFromExcel(ctx: TenantContext, buffer: Buffer) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { imported: 0, errors: ['Sayfa bulunamadi'] };

    const rows: CreateStudentDto[] = [];
    const errors: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // baslik satiri
      const [
        ,
        studentNumber,
        firstName,
        lastName,
        guardianName,
        guardianPhone,
        guardianEmail,
        enrollDate,
      ] = row.values as unknown[];
      if (!studentNumber || !firstName || !lastName) {
        errors.push(`Satir ${rowNumber}: zorunlu alan eksik`);
        return;
      }
      rows.push({
        studentNumber: String(studentNumber),
        firstName: String(firstName),
        lastName: String(lastName),
        guardianName: guardianName ? String(guardianName) : undefined,
        guardianPhone: guardianPhone ? String(guardianPhone) : undefined,
        guardianEmail: guardianEmail ? String(guardianEmail) : undefined,
        enrollDate: enrollDate
          ? new Date(enrollDate as any).toISOString()
          : new Date().toISOString(),
      });
    });

    // Not: institutionId+studentNumber uzerinde Prisma-seviyesinde bir @@unique
    // yok (bilerek) - benzersizlik kisiti sadece aktif kayitlar arasinda gecerli
    // olacak sekilde raw SQL ile kuruldu (bkz. prisma/rls-policies.sql), bu yuzden
    // burada upsert yerine elle bul-sonra-olustur/guncelle yapiyoruz.
    // Not: withTenant zaten bir transaction icinde calisir (RLS SET LOCAL icin
    // sart) - Prisma'nin interaktif transaction client'i icinde ikinci bir
    // $transaction acilamaz, bu yuzden dogrudan tx uzerinden sirayla yaziyoruz.
    await withTenant(ctx, async (tx) => {
      for (const r of rows) {
        const existing = await tx.student.findFirst({
          where: {
            institutionId: ctx.institutionId!,
            studentNumber: r.studentNumber,
            deletedAt: null,
          },
        });
        if (existing) {
          await tx.student.update({
            where: { id: existing.id },
            data: { firstName: r.firstName, lastName: r.lastName },
          });
        } else {
          await tx.student.create({
            data: { ...r, enrollDate: new Date(r.enrollDate), institutionId: ctx.institutionId! },
          });
        }
      }
    });

    return { imported: rows.length, errors };
  }
}
