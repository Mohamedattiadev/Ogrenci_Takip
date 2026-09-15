import { Injectable } from '@nestjs/common';
import { withTenant, type Prisma } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { dayRange } from '../common/dates';
import { institutionNames, ref, userNames } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { AuditQueryDto } from './audit.controller';

@Injectable()
export class AuditService {
  list(user: AuthenticatedUser, query: AuditQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.AuditLogWhereInput = {
        ...(query.entityType ? { entityType: query.entityType } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.from || query.to ? { createdAt: dayRange(query.from, query.to) } : {}),
        ...(query.search ? { action: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
        tx.auditLog.count({ where }),
      ]);
      const [actors, institutions] = await Promise.all([
        userNames(
          tx,
          rows.map((r) => r.actorId),
        ),
        institutionNames(
          tx,
          rows.map((r) => r.institutionId),
        ),
      ]);
      return toPage(
        rows.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          before: r.before,
          after: r.after,
          actor: ref(r.actorId, actors),
          institution: ref(r.institutionId, institutions),
          createdAt: r.createdAt,
        })),
        total,
        query,
      );
    });
  }
}
