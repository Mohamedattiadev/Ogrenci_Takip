import { Injectable } from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { contains, pageArgs, toPage } from '../common/pagination';
import type {
  CreateInstitutionDto,
  InstitutionQueryDto,
  UpdateInstitutionDto,
} from './dto/create-institution.dto';

const COUNTS = {
  _count: {
    select: {
      students: { where: { deletedAt: null, withdrawDate: null } },
      groups: { where: { deletedAt: null } },
      teacherAssignments: { where: { isActive: true } },
    },
  },
} satisfies Prisma.InstitutionInclude;

type InstitutionWithCounts = Prisma.InstitutionGetPayload<{ include: typeof COUNTS }>;

@Injectable()
export class InstitutionsService {
  // RLS filtreler: sistem yoneticisi hepsini, yurt yoneticisi kendi yurdunu,
  // hoca gorevlendirildigi yurtlari gorur.
  list(user: AuthenticatedUser, query: InstitutionQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.InstitutionWhereInput = {
        deletedAt: null,
        ...(query.gender ? { gender: query.gender } : {}),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.search
          ? { OR: [{ name: contains(query.search) }, { code: contains(query.search) }] }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.institution.findMany({
          where,
          include: COUNTS,
          orderBy: { name: 'asc' },
          ...pageArgs(query),
        }),
        tx.institution.count({ where }),
      ]);
      return toPage(rows.map(present), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) =>
      present(
        await tx.institution.findFirstOrThrow({ where: { id, deletedAt: null }, include: COUNTS }),
      ),
    );
  }

  create(user: AuthenticatedUser, dto: CreateInstitutionDto) {
    return withTenant(toTenantContext(user), async (tx) =>
      present(await tx.institution.create({ data: dto, include: COUNTS })),
    );
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateInstitutionDto) {
    return withTenant(toTenantContext(user), async (tx) =>
      present(await tx.institution.update({ where: { id }, data: dto, include: COUNTS })),
    );
  }

  /** Yumusak silme: gecmis yoklama ve raporlar korunur. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx: PrismaClient) => {
      await tx.institution.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
    });
  }
}

function present(institution: InstitutionWithCounts) {
  return {
    id: institution.id,
    name: institution.name,
    code: institution.code,
    gender: institution.gender,
    isActive: institution.isActive,
    createdAt: institution.createdAt,
    updatedAt: institution.updatedAt,
    activeStudentCount: institution._count.students,
    groupCount: institution._count.groups,
    activeAssignmentCount: institution._count.teacherAssignments,
  };
}
