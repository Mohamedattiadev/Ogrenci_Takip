import { BadRequestException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UserRole, withTenant, type TenantContext } from '@yoklama/db';
import type { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  async create(ctx: TenantContext, dto: CreateUserDto) {
    // SUPER_ADMIN baska bir kurum icin kullanici acabilir; digerleri sadece kendi kurumu icin.
    const institutionId = ctx.isSuperAdmin ? (dto.institutionId ?? null) : ctx.institutionId;
    if (dto.role !== UserRole.SUPER_ADMIN && !institutionId) {
      throw new BadRequestException('Bu rol icin bir kurum belirtilmeli');
    }
    const passwordHash = await hash(dto.password, 10);
    return withTenant(ctx, (tx) =>
      tx.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash,
          institutionId,
        },
        select: { id: true, email: true, fullName: true, role: true, institutionId: true },
      }),
    );
  }

  findAll(ctx: TenantContext) {
    return withTenant(ctx, (tx) =>
      tx.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          institutionId: true,
          isActive: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    );
  }

  deactivate(ctx: TenantContext, id: string) {
    return withTenant(ctx, (tx) => tx.user.update({ where: { id }, data: { isActive: false } }));
  }
}
