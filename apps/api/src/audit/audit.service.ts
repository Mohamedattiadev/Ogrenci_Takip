import { Injectable } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';

@Injectable()
export class AuditService {
  findAll(ctx: TenantContext, entityType?: string) {
    return withTenant(ctx, (tx) =>
      tx.auditLog.findMany({
        where: entityType ? { entityType } : {},
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  }
}
