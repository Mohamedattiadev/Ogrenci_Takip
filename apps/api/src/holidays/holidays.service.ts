import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole, withTenant, type Prisma } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { dateOnly, dayRange, formatDate } from '../common/dates';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { CreateHolidayDto, HolidayQueryDto } from './holidays.dto';

@Injectable()
export class HolidaysService {
  list(user: AuthenticatedUser, query: HolidayQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.HolidayWhereInput = {
        ...(query.from || query.to ? { date: dayRange(query.from, query.to) } : {}),
        ...(query.institutionId
          ? { OR: [{ institutionId: query.institutionId }, { institutionId: null }] }
          : {}),
        ...(query.search ? { description: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.holiday.findMany({ where, orderBy: { date: 'asc' }, ...pageArgs(query) }),
        tx.holiday.count({ where }),
      ]);
      const names = await institutionNames(
        tx,
        rows.map((r) => r.institutionId),
      );
      return toPage(
        rows.map((r) => ({
          id: r.id,
          date: formatDate(r.date),
          description: r.description,
          allInstitutions: r.institutionId === null,
          institution: ref(r.institutionId, names),
        })),
        total,
        query,
      );
    });
  }

  /**
   * Tatil eklenince o gun planlanmis ve yoklamasi girilmemis dersler otomatik iptal edilir;
   * sonradan ders programi uretilirken de bu gun atlanir.
   */
  create(user: AuthenticatedUser, dto: CreateHolidayDto) {
    let institutionId: string | null;
    if (dto.allInstitutions) {
      if (user.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Tum yurtlar icin tatili sadece sistem yoneticisi ekleyebilir',
        );
      }
      institutionId = null;
    } else {
      institutionId = targetInstitution(user, dto.institutionId);
    }
    const date = dateOnly(dto.date);
    return withTenant(toTenantContext(user), async (tx) => {
      const holiday = await tx.holiday.create({
        data: { date, description: dto.description, institutionId },
      });
      const cancelled = await tx.sessionOccurrence.updateMany({
        where: {
          date,
          isCancelled: false,
          attendanceRecords: { none: {} },
          ...(institutionId ? { schedule: { institutionId } } : {}),
        },
        data: { isCancelled: true, cancelReason: `Tatil: ${dto.description}` },
      });
      return {
        id: holiday.id,
        date: formatDate(holiday.date),
        description: holiday.description,
        allInstitutions: institutionId === null,
        cancelledSessionCount: cancelled.count,
      };
    });
  }

  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.holiday.delete({ where: { id } });
    });
  }
}
