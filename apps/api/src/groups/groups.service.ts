import { Injectable, NotFoundException } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';
import type { AssignMembershipDto, CreateGroupDto } from './dto/group.dto';

@Injectable()
export class GroupsService {
  create(ctx: TenantContext, dto: CreateGroupDto) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    return withTenant(ctx, (tx) =>
      tx.group.create({ data: { ...dto, institutionId: ctx.institutionId! } }),
    );
  }

  findAll(ctx: TenantContext, termId?: string) {
    return withTenant(ctx, (tx) =>
      tx.group.findMany({
        where: { deletedAt: null, ...(termId ? { termId } : {}) },
        orderBy: { name: 'asc' },
      }),
    );
  }

  members(ctx: TenantContext, groupId: string) {
    return withTenant(ctx, (tx) =>
      tx.groupMembership.findMany({
        where: { groupId, effectiveTo: null },
        include: { student: true },
      }),
    );
  }

  /** Ogrenciyi yeni bir gruba tasir: eski uyelik kapatilir, yeni uyelik acilir - gecmis korunur. */
  assign(ctx: TenantContext, dto: AssignMembershipDto) {
    const effectiveFrom = new Date(dto.effectiveFrom);
    return withTenant(ctx, async (tx) => {
      await tx.groupMembership.updateMany({
        where: { studentId: dto.studentId, effectiveTo: null },
        data: { effectiveTo: effectiveFrom },
      });
      return tx.groupMembership.create({
        data: { studentId: dto.studentId, groupId: dto.groupId, effectiveFrom },
      });
    });
  }

  history(ctx: TenantContext, studentId: string) {
    return withTenant(ctx, (tx) =>
      tx.groupMembership.findMany({
        where: { studentId },
        include: { group: true },
        orderBy: { effectiveFrom: 'desc' },
      }),
    );
  }
}
