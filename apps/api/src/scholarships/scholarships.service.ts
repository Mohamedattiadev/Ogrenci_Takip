import { Injectable } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';
import { CreateScholarshipDto, CreateTeacherAssignmentDto } from './scholarships.dto';

@Injectable()
export class ScholarshipsService {
  list(ctx: TenantContext) {
    return withTenant(ctx, (tx) => tx.scholarshipProgram.findMany({ orderBy: { name: 'asc' } }));
  }

  create(ctx: TenantContext, dto: CreateScholarshipDto) {
    return withTenant(ctx, (tx) => tx.scholarshipProgram.create({ data: dto }));
  }

  assignments(ctx: TenantContext) {
    return withTenant(ctx, (tx) =>
      tx.teacherAssignment.findMany({
        include: {
          teacher: { select: { id: true, fullName: true } },
          institution: { select: { id: true, name: true } },
          scholarshipProgram: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  assign(ctx: TenantContext, dto: CreateTeacherAssignmentDto) {
    return withTenant(ctx, (tx) =>
      tx.teacherAssignment.upsert({
        where: { teacherId_institutionId_scholarshipProgramId: dto },
        create: dto,
        update: { isActive: true },
      }),
    );
  }

  setActive(ctx: TenantContext, id: string, isActive: boolean) {
    return withTenant(ctx, async (tx) => {
      if (!isActive)
        await tx.lessonSchedule.updateMany({
          where: { assignmentId: id },
          data: { isActive: false },
        });
      return tx.teacherAssignment.update({ where: { id }, data: { isActive } });
    });
  }
}
