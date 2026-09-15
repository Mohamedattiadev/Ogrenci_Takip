import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { institutionNames, ref, userNames } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import { RealtimeService, type RealtimeEvent } from '../realtime/realtime.service';
import type {
  AssignmentListQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './assignments.dto';

const ASSIGNMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  dueAt: true,
  allowText: true,
  allowFile: true,
  createdAt: true,
  updatedAt: true,
  institutionId: true,
  createdById: true,
  schedule: {
    select: {
      id: true,
      teacherId: true,
      groupId: true,
      dayOfWeek: true,
      startTime: true,
      group: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  },
  _count: { select: { submissions: true } },
} satisfies Prisma.AssignmentSelect;

type AssignmentRow = Prisma.AssignmentGetPayload<{ select: typeof ASSIGNMENT_SELECT }>;

const SUBMISSION_META = {
  id: true,
  studentId: true,
  text: true,
  fileName: true,
  fileSize: true,
  submittedAt: true,
  updatedAt: true,
} satisfies Prisma.AssignmentSubmissionSelect;

/**
 * Hoca ve yoneticinin odev yonetimi. Hoca yalnizca kendi derslerinde, yurt yoneticisi
 * kendi yurdunda odev acar/gorur (RLS). Teslimler anlik olarak /events akisina duser.
 */
@Injectable()
export class AssignmentsService {
  constructor(private readonly realtime: RealtimeService) {}

  list(user: AuthenticatedUser, query: AssignmentListQueryDto) {
    const now = new Date();
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.AssignmentWhereInput = {
        deletedAt: null,
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.scheduleId ? { scheduleId: query.scheduleId } : {}),
        ...(query.groupId ? { schedule: { groupId: query.groupId } } : {}),
        ...(query.status === 'open' ? { OR: [{ dueAt: null }, { dueAt: { gte: now } }] } : {}),
        ...(query.status === 'closed' ? { dueAt: { lt: now } } : {}),
        ...(query.search ? { title: contains(query.search) } : {}),
      };
      const [rows, total] = await Promise.all([
        tx.assignment.findMany({
          where,
          select: ASSIGNMENT_SELECT,
          orderBy: [{ createdAt: 'desc' }],
          ...pageArgs(query),
        }),
        tx.assignment.count({ where }),
      ]);
      return toPage(await present(tx, rows), total, query);
    });
  }

  async create(user: AuthenticatedUser, dto: CreateAssignmentDto) {
    const allowText = dto.allowText ?? true;
    const allowFile = dto.allowFile ?? true;
    if (!allowText && !allowFile) {
      throw new BadRequestException('Odev en az metin veya dosya cevabi kabul etmeli');
    }
    const { assignment, event } = await withTenant(toTenantContext(user), async (tx) => {
      const schedule = await tx.lessonSchedule.findFirst({
        where: { id: dto.scheduleId, isActive: true },
        select: { id: true, teacherId: true, institutionId: true, groupId: true },
      });
      if (!schedule) throw new NotFoundException('Ders programi bulunamadi');
      if (user.role === UserRole.TEACHER && schedule.teacherId !== user.userId) {
        throw new ForbiddenException('Sadece kendi dersinize odev verebilirsiniz');
      }
      const row = await tx.assignment.create({
        data: {
          scheduleId: schedule.id,
          institutionId: schedule.institutionId,
          title: dto.title,
          description: dto.description,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          allowText,
          allowFile,
          createdById: user.userId,
        },
        select: ASSIGNMENT_SELECT,
      });
      const [presented] = await present(tx, [row]);
      return {
        assignment: presented,
        event: await this.event(tx, 'assignment.created', row, {
          assignmentId: row.id,
          title: row.title,
        }),
      };
    });
    this.realtime.publish(event);
    return assignment;
  }

  /** Detay + o dersin ogrenci listesi ve her ogrencinin teslim durumu (dosya icerigi haric). */
  get(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.assignment.findFirst({
        where: { id, deletedAt: null },
        select: ASSIGNMENT_SELECT,
      });
      if (!row) throw new NotFoundException('Odev bulunamadi');
      const [presented] = await present(tx, [row]);
      const [members, submissions] = await Promise.all([
        tx.groupMembership.findMany({
          where: { groupId: row.schedule.groupId, effectiveTo: null },
          select: {
            student: { select: { id: true, studentNumber: true, firstName: true, lastName: true } },
          },
          orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
        }),
        tx.assignmentSubmission.findMany({
          where: { assignmentId: id },
          select: SUBMISSION_META,
          orderBy: { submittedAt: 'desc' },
        }),
      ]);
      const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
      const students = members.map(({ student }) => ({
        student: { ...student, fullName: `${student.firstName} ${student.lastName}` },
        submission: presentSubmission(byStudent.get(student.id)),
      }));
      return {
        ...presented,
        submittedCount: submissions.length,
        students,
      };
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAssignmentDto) {
    const { assignment, event } = await withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.assignment.findFirst({
        where: { id, deletedAt: null },
        select: { allowText: true, allowFile: true },
      });
      if (!current) throw new NotFoundException('Odev bulunamadi');
      const allowText = dto.allowText ?? current.allowText;
      const allowFile = dto.allowFile ?? current.allowFile;
      if (!allowText && !allowFile) {
        throw new BadRequestException('Odev en az metin veya dosya cevabi kabul etmeli');
      }
      const row = await tx.assignment.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          dueAt:
            dto.dueAt === undefined ? undefined : dto.dueAt === null ? null : new Date(dto.dueAt),
          allowText,
          allowFile,
        },
        select: ASSIGNMENT_SELECT,
      });
      const [presented] = await present(tx, [row]);
      return {
        assignment: presented,
        event: await this.event(tx, 'assignment.updated', row, {
          assignmentId: row.id,
          title: row.title,
        }),
      };
    });
    this.realtime.publish(event);
    return assignment;
  }

  /** Yumusak silme: teslimler korunur, ogrenci listesinden kalkar. */
  async remove(user: AuthenticatedUser, id: string) {
    const event = await withTenant(toTenantContext(user), async (tx) => {
      const row = await tx.assignment.findFirst({
        where: { id, deletedAt: null },
        select: ASSIGNMENT_SELECT,
      });
      if (!row) throw new NotFoundException('Odev bulunamadi');
      await tx.assignment.update({ where: { id }, data: { deletedAt: new Date() } });
      return this.event(tx, 'assignment.removed', row, { assignmentId: id });
    });
    this.realtime.publish(event);
  }

  file(user: AuthenticatedUser, id: string, studentId: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      const submission = await tx.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId: id, studentId } },
        select: { fileName: true, fileData: true },
      });
      if (!submission?.fileData || !submission.fileName)
        throw new NotFoundException('Yuklenmis PDF yok');
      return { fileName: submission.fileName, data: Buffer.from(submission.fileData) };
    });
  }

  private async event(
    tx: PrismaClient,
    type: RealtimeEvent['type'],
    row: AssignmentRow,
    payload: Record<string, unknown>,
  ): Promise<RealtimeEvent> {
    const members = await tx.groupMembership.findMany({
      where: { groupId: row.schedule.groupId, effectiveTo: null },
      select: { studentId: true },
    });
    return {
      type,
      institutionId: row.institutionId,
      teacherId: row.schedule.teacherId,
      studentIds: members.map((m) => m.studentId),
      payload,
    };
  }
}

function presentSubmission(
  s: Prisma.AssignmentSubmissionGetPayload<{ select: typeof SUBMISSION_META }> | undefined,
) {
  if (!s) return null;
  return {
    id: s.id,
    text: s.text,
    file: s.fileName ? { name: s.fileName, size: s.fileSize } : null,
    submittedAt: s.submittedAt,
    updatedAt: s.updatedAt,
  };
}

async function present(tx: PrismaClient, rows: AssignmentRow[]) {
  const groupIds = [...new Set(rows.map((r) => r.schedule.groupId))];
  const [teachers, institutions, rosters] = await Promise.all([
    userNames(
      tx,
      rows.map((r) => r.schedule.teacherId),
    ),
    institutionNames(
      tx,
      rows.map((r) => r.institutionId),
    ),
    groupIds.length
      ? tx.groupMembership.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds }, effectiveTo: null },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const rosterSize = new Map(rosters.map((r) => [r.groupId, r._count._all]));
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    dueAt: r.dueAt,
    isOpen: !r.dueAt || r.dueAt >= now,
    allowText: r.allowText,
    allowFile: r.allowFile,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    scheduleId: r.schedule.id,
    course: r.schedule.course,
    group: r.schedule.group,
    teacher: ref(r.schedule.teacherId, teachers),
    institution: ref(r.institutionId, institutions),
    submittedCount: r._count.submissions,
    rosterSize: rosterSize.get(r.schedule.groupId) ?? 0,
  }));
}
