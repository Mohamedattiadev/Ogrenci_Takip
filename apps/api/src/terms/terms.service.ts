import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { withTenant, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { dateOnly } from '../common/dates';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { CreateTermDto, TermQueryDto, UpdateTermDto } from './terms.dto';

type Term = Awaited<ReturnType<PrismaClient['academicTerm']['findFirstOrThrow']>> & {
  _count: { groups: number };
};

@Injectable()
export class TermsService {
  list(user: AuthenticatedUser, query: TermQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where = {
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.search ? { name: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.academicTerm.findMany({
          where,
          include: { _count: { select: { groups: true } } },
          orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
          ...pageArgs(query),
        }),
        tx.academicTerm.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const term = await tx.academicTerm.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { groups: true } } },
      });
      return (await present(tx, [term]))[0];
    });
  }

  create(user: AuthenticatedUser, dto: CreateTermDto) {
    const institutionId = targetInstitution(user, dto.institutionId);
    const { startDate, endDate } = checkedRange(dto.startDate, dto.endDate);
    return withTenant(toTenantContext(user), async (tx) => {
      const term = await tx.academicTerm.create({
        data: { institutionId, name: dto.name.trim(), startDate, endDate },
        include: { _count: { select: { groups: true } } },
      });
      return (await present(tx, [term]))[0];
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateTermDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.academicTerm.findUniqueOrThrow({ where: { id } });
      const { startDate, endDate } = checkedRange(
        dto.startDate ?? current.startDate,
        dto.endDate ?? current.endDate,
      );
      const term = await tx.academicTerm.update({
        where: { id },
        data: { ...(dto.name ? { name: dto.name.trim() } : {}), startDate, endDate },
        include: { _count: { select: { groups: true } } },
      });
      return (await present(tx, [term]))[0];
    });
  }

  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const groups = await tx.group.count({ where: { termId: id } });
      if (groups > 0) {
        throw new ConflictException(
          'Bu doneme bagli gruplar var; once gruplari tasiyin veya silin',
        );
      }
      await tx.academicTerm.delete({ where: { id } });
    });
  }
}

function checkedRange(start: string | Date, end: string | Date) {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  if (endDate <= startDate) throw new BadRequestException('Donem bitisi baslangictan sonra olmali');
  return { startDate, endDate };
}

async function present(tx: PrismaClient, terms: Term[]) {
  const names = await institutionNames(
    tx,
    terms.map((t) => t.institutionId),
  );
  return terms.map((term) => ({
    id: term.id,
    name: term.name,
    startDate: term.startDate,
    endDate: term.endDate,
    institution: ref(term.institutionId, names),
    groupCount: term._count.groups,
  }));
}
