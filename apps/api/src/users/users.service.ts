import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UserRole, withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type {
  CreateUserDto,
  SetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/create-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  institutionId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { assignments: { where: { isActive: true } } } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class UsersService {
  // Yurt yoneticisi: kendi yurdunun kullanicilari + yurduna gorevlendirilmis hocalar (RLS).
  list(user: AuthenticatedUser, query: UserQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.UserWhereInput = {
        deletedAt: null,
        ...(query.role ? { role: query.role } : {}),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.institutionId
          ? {
              OR: [
                { institutionId: query.institutionId },
                { assignments: { some: { institutionId: query.institutionId, isActive: true } } },
              ],
            }
          : {}),
        ...(query.search
          ? {
              AND: [
                { OR: [{ fullName: contains(query.search) }, { email: contains(query.search) }] },
              ],
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.user.findMany({
          where,
          select: USER_SELECT,
          orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
          ...pageArgs(query),
        }),
        tx.user.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.user.findFirstOrThrow({
        where: { id, deletedAt: null },
        select: {
          ...USER_SELECT,
          assignments: {
            select: {
              id: true,
              isActive: true,
              institutionId: true,
              scholarshipProgram: { select: { id: true, code: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      const [presented] = await present(tx, [row]);
      const names = await institutionNames(
        tx,
        row.assignments.map((a) => a.institutionId),
      );
      return {
        ...presented,
        assignments: row.assignments.map((a) => ({
          id: a.id,
          isActive: a.isActive,
          institution: ref(a.institutionId, names),
          scholarshipProgram: a.scholarshipProgram,
        })),
      };
    });
  }

  async create(user: AuthenticatedUser, dto: CreateUserDto) {
    this.assertRoleAllowed(user, dto.role);
    const institutionId =
      dto.role === UserRole.SUPER_ADMIN ? null : targetInstitution(user, dto.institutionId);
    const passwordHash = await hash(dto.password, 10);
    return withTenant(toTenantContext(user), async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash,
          institutionId,
        },
        select: USER_SELECT,
      });
      return (await present(tx, [created]))[0];
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    if (id === user.userId && (dto.role !== undefined || dto.isActive === false)) {
      throw new ForbiddenException('Kendi rolunuzu degistiremez veya hesabinizi kapatamazsiniz');
    }
    if (dto.role) this.assertRoleAllowed(user, dto.role);
    if (dto.institutionId !== undefined && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Kullanicinin yurdunu sadece sistem yoneticisi degistirebilir');
    }
    return withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.user.findFirstOrThrow({ where: { id, deletedAt: null } });
      if (user.role !== UserRole.SUPER_ADMIN && current.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Sistem yoneticisi hesabi degistirilemez');
      }
      const role = dto.role ?? current.role;
      const institutionId =
        role === UserRole.SUPER_ADMIN ? null : (dto.institutionId ?? current.institutionId);
      if (role !== UserRole.SUPER_ADMIN && !institutionId) {
        throw new BadRequestException('Bu rol icin bir yurt secilmeli');
      }
      const updated = await tx.user.update({
        where: { id },
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role,
          institutionId,
          isActive: dto.isActive,
        },
        select: USER_SELECT,
      });
      return (await present(tx, [updated]))[0];
    });
  }

  async setPassword(user: AuthenticatedUser, id: string, dto: SetPasswordDto) {
    if (id === user.userId) {
      throw new BadRequestException('Kendi sifreniz icin PATCH /auth/me/password kullanin');
    }
    const passwordHash = await hash(dto.password, 10);
    await withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.user.findFirstOrThrow({ where: { id, deletedAt: null } });
      if (user.role !== UserRole.SUPER_ADMIN && current.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Sistem yoneticisi hesabi degistirilemez');
      }
      await tx.user.update({ where: { id }, data: { passwordHash } });
    });
  }

  /** Yumusak silme: yoklama gecmisindeki "kim isaretledi" bilgisi korunur. */
  remove(user: AuthenticatedUser, id: string) {
    if (id === user.userId) throw new ForbiddenException('Kendi hesabinizi silemezsiniz');
    return withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.user.findFirstOrThrow({ where: { id, deletedAt: null } });
      if (user.role !== UserRole.SUPER_ADMIN && current.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Sistem yoneticisi hesabi silinemez');
      }
      await tx.user.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
    });
  }

  private assertRoleAllowed(user: AuthenticatedUser, role: UserRole) {
    if (role === UserRole.SUPER_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sistem yoneticisini sadece sistem yoneticisi atayabilir');
    }
  }
}

async function present(tx: PrismaClient, rows: UserRow[]) {
  const names = await institutionNames(
    tx,
    rows.map((r) => r.institutionId),
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    institution: ref(row.institutionId, names),
    activeAssignmentCount: row._count.assignments,
  }));
}
