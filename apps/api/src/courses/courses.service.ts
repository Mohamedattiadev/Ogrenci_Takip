import { ConflictException, Injectable } from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { targetInstitution } from '../common/institution-scope';
import { institutionNames, ref } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './courses.dto';

const COURSE_INCLUDE = {
  _count: { select: { schedules: { where: { isActive: true } } } },
} satisfies Prisma.CourseInclude;

type CourseRow = Prisma.CourseGetPayload<{ include: typeof COURSE_INCLUDE }>;

@Injectable()
export class CoursesService {
  list(user: AuthenticatedUser, query: CourseQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.CourseWhereInput = {
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.search ? { name: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.course.findMany({
          where,
          include: COURSE_INCLUDE,
          orderBy: { name: 'asc' },
          ...pageArgs(query),
        }),
        tx.course.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(
      toTenantContext(user),
      async (tx) =>
        (
          await present(tx, [
            await tx.course.findUniqueOrThrow({ where: { id }, include: COURSE_INCLUDE }),
          ])
        )[0],
    );
  }

  create(user: AuthenticatedUser, dto: CreateCourseDto) {
    const institutionId = targetInstitution(user, dto.institutionId);
    return withTenant(toTenantContext(user), async (tx) => {
      const duplicate = await tx.course.findFirst({
        where: { institutionId, name: { equals: dto.name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) throw new ConflictException('Bu yurtta ayni adli ders zaten var');
      const row = await tx.course.create({
        data: { institutionId, name: dto.name },
        include: COURSE_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateCourseDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.course.update({
        where: { id },
        data: { name: dto.name },
        include: COURSE_INCLUDE,
      });
      return (await present(tx, [row]))[0];
    });
  }

  /** Ders programinda (gecmis dahil) kullanilan ders silinemez; yoklama gecmisi bozulmaz. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const used = await tx.lessonSchedule.count({ where: { courseId: id } });
      if (used > 0) throw new ConflictException('Bu ders, ders programinda kullaniliyor');
      await tx.course.delete({ where: { id } });
    });
  }
}

async function present(tx: PrismaClient, rows: CourseRow[]) {
  const names = await institutionNames(
    tx,
    rows.map((r) => r.institutionId),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    institution: ref(r.institutionId, names),
    activeScheduleCount: r._count.schedules,
  }));
}
