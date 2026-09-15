import { Injectable } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';
import type { CreateInstitutionDto } from './dto/create-institution.dto';

@Injectable()
export class InstitutionsService {
  create(ctx: TenantContext, dto: CreateInstitutionDto) {
    return withTenant(ctx, (tx) => tx.institution.create({ data: dto }));
  }

  findAll(ctx: TenantContext) {
    // RLS kendisi filtreliyor: SUPER_ADMIN hepsini, digerleri sadece kendi kurumunu gorur.
    return withTenant(ctx, (tx) =>
      tx.institution.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    );
  }

  findOne(ctx: TenantContext, id: string) {
    return withTenant(ctx, (tx) => tx.institution.findUnique({ where: { id } }));
  }
}
