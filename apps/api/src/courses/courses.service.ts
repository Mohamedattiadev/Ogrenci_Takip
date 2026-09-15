import { Injectable, NotFoundException } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';

@Injectable()
export class CoursesService {
  create(ctx: TenantContext, name: string) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    return withTenant(ctx, (tx) =>
      tx.course.create({ data: { name, institutionId: ctx.institutionId! } }),
    );
  }

  findAll(ctx: TenantContext) {
    return withTenant(ctx, (tx) => tx.course.findMany({ orderBy: { name: 'asc' } }));
  }
}
