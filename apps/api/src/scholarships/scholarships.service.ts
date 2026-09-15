import { Injectable } from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { institutionNames, ref, userNames } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type {
  AssignmentQueryDto,
  CreateScholarshipDto,
  CreateTeacherAssignmentDto,
  ProgramQueryDto,
  UpdateScholarshipDto,
} from './scholarships.dto';

const PROGRAM_COUNTS = {
  _count: {
    select: {
      students: { where: { deletedAt: null, withdrawDate: null } },
      groups: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.ScholarshipProgramInclude;

type ProgramWithCounts = Prisma.ScholarshipProgramGetPayload<{ include: typeof PROGRAM_COUNTS }>;

const ASSIGNMENT_INCLUDE = {
  scholarshipProgram: { select: { id: true, code: true, name: true } },
  _count: { select: { schedules: { where: { isActive: true } } } },
} satisfies Prisma.TeacherAssignmentInclude;

type AssignmentRow = Prisma.TeacherAssignmentGetPayload<{ include: typeof ASSIGNMENT_INCLUDE }>;

@Injectable()
export class ScholarshipProgramsService {
  list(user: AuthenticatedUser, query: ProgramQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.ScholarshipProgramWhereInput = {
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.search
          ? { OR: [{ name: contains(query.search) }, { code: contains(query.search) }] }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.scholarshipProgram.findMany({
          where,
          include: PROGRAM_COUNTS,
          orderBy: { name: 'asc' },
          ...pageArgs(query),
        }),
        tx.scholarshipProgram.count({ where }),
      ]);
      return toPage(rows.map(presentProgram), total, query);
    });
  }

  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) =>
      presentProgram(
        await tx.scholarshipProgram.findUniqueOrThrow({ where: { id }, include: PROGRAM_COUNTS }),
      ),
    );
  }

  create(user: AuthenticatedUser, dto: CreateScholarshipDto) {
    return withTenant(toTenantContext(user), async (tx) =>
      presentProgram(await tx.scholarshipProgram.create({ data: dto, include: PROGRAM_COUNTS })),
    );
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateScholarshipDto) {
    return withTenant(toTenantContext(user), async (tx) =>
      presentProgram(
        await tx.scholarshipProgram.update({ where: { id }, data: dto, include: PROGRAM_COUNTS }),
      ),
    );
  }
}

@Injectable()
export class TeacherAssignmentsService {
  list(user: AuthenticatedUser, query: AssignmentQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.TeacherAssignmentWhereInput = {
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
        ...(query.scholarshipProgramId ? { scholarshipProgramId: query.scholarshipProgramId } : {}),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
        ...(query.search
          ? {
              OR: [
                { teacher: { fullName: contains(query.search) } },
                { scholarshipProgram: { name: contains(query.search) } },
                { institution: { name: contains(query.search) } },
              ],
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.teacherAssignment.findMany({
          where,
          include: ASSIGNMENT_INCLUDE,
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
          ...pageArgs(query),
        }),
        tx.teacherAssignment.count({ where }),
      ]);
      return toPage(await presentAssignments(tx, rows), total, query);
    });
  }

  /** Ayni hoca+yurt+program zaten varsa yeniden aktiflestirilir (tekil kayit). */
  create(user: AuthenticatedUser, dto: CreateTeacherAssignmentDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const assignment = await tx.teacherAssignment.upsert({
        where: {
          teacherId_institutionId_scholarshipProgramId: {
            teacherId: dto.teacherId,
            institutionId: dto.institutionId,
            scholarshipProgramId: dto.scholarshipProgramId,
          },
        },
        create: { ...dto },
        update: { isActive: true },
        include: ASSIGNMENT_INCLUDE,
      });
      return (await presentAssignments(tx, [assignment]))[0];
    });
  }

  /** Pasiflestirme bagli haftalik dersleri de kapatir; hoca o gruplari artik goremez. */
  setActive(user: AuthenticatedUser, id: string, isActive: boolean) {
    return withTenant(toTenantContext(user), async (tx) => {
      if (!isActive) {
        await tx.lessonSchedule.updateMany({
          where: { assignmentId: id },
          data: { isActive: false },
        });
      }
      const assignment = await tx.teacherAssignment.update({
        where: { id },
        data: { isActive },
        include: ASSIGNMENT_INCLUDE,
      });
      return (await presentAssignments(tx, [assignment]))[0];
    });
  }
}

function presentProgram(program: ProgramWithCounts) {
  return {
    id: program.id,
    code: program.code,
    name: program.name,
    isActive: program.isActive,
    createdAt: program.createdAt,
    activeStudentCount: program._count.students,
    groupCount: program._count.groups,
  };
}

async function presentAssignments(tx: PrismaClient, rows: AssignmentRow[]) {
  const [teachers, institutions] = await Promise.all([
    userNames(
      tx,
      rows.map((r) => r.teacherId),
    ),
    institutionNames(
      tx,
      rows.map((r) => r.institutionId),
    ),
  ]);
  return rows.map((row) => ({
    id: row.id,
    isActive: row.isActive,
    createdAt: row.createdAt,
    teacher: ref(row.teacherId, teachers),
    institution: ref(row.institutionId, institutions),
    scholarshipProgram: row.scholarshipProgram,
    activeScheduleCount: row._count.schedules,
  }));
}
