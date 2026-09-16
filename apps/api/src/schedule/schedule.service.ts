import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { withTenant, type Prisma, type PrismaClient } from '@yoklama/db';
import { toTenantContext, type AuthenticatedUser } from '../auth/types';
import { DAY_NAMES, todayInTurkey, formatDate, addDays } from '../common/dates';
import {
  breakRanges,
  occursOn,
  syncCalendar,
  validateCalendar,
  type CalendarSlot,
} from './calendar';
import { institutionNames, ref, userNames } from '../common/lookups';
import { contains, pageArgs, toPage } from '../common/pagination';
import type { CreateScheduleDto, ScheduleQueryDto, UpdateScheduleDto } from './dto/schedule.dto';

const SCHEDULE_INCLUDE = {
  group: {
    select: {
      id: true,
      name: true,
      scholarshipProgramId: true,
      scholarshipProgram: { select: { id: true, code: true, name: true } },
    },
  },
  course: { select: { id: true, name: true } },
} satisfies Prisma.LessonScheduleInclude;

type ScheduleRow = Prisma.LessonScheduleGetPayload<{ include: typeof SCHEDULE_INCLUDE }>;

interface Slot extends CalendarSlot {
  id?: string;
  groupId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class ScheduleService {
  list(user: AuthenticatedUser, query: ScheduleQueryDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const where: Prisma.LessonScheduleWhereInput = {
        isActive: query.isActive,
        group: { deletedAt: null },
        ...(query.institutionId ? { institutionId: query.institutionId } : {}),
        ...(query.groupId ? { groupId: query.groupId } : {}),
        ...(query.teacherId ? { teacherId: query.teacherId } : {}),
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.dayOfWeek === undefined ? {} : { dayOfWeek: query.dayOfWeek }),
        ...(query.search
          ? {
              OR: [
                { group: { name: contains(query.search) } },
                { course: { name: contains(query.search) } },
                { teacher: { fullName: contains(query.search) } },
                { classroom: contains(query.search) },
              ],
            }
          : {}),
      };
      const [rows, total] = await Promise.all([
        tx.lessonSchedule.findMany({
          where,
          include: SCHEDULE_INCLUDE,
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          ...pageArgs(query),
        }),
        tx.lessonSchedule.count({ where }),
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
            await tx.lessonSchedule.findUniqueOrThrow({ where: { id }, include: SCHEDULE_INCLUDE }),
          ])
        )[0],
    );
  }

  /** Yurt gruptan alinir; burs programli grupta hocanin aktif gorevlendirmesi aranir. */
  create(user: AuthenticatedUser, dto: CreateScheduleDto) {
    assertTimes(dto.startTime, dto.endTime);
    const calendar = validateCalendar(dto.startDate, dto.endDate, dto.breaks ?? []);
    return withTenant(toTenantContext(user), async (tx) => {
      const group = await tx.group.findFirstOrThrow({
        where: { id: dto.groupId, deletedAt: null },
        select: { id: true, institutionId: true, scholarshipProgramId: true },
      });
      const assignmentId = await resolveAssignment(tx, dto.teacherId, group);
      await assertNoConflict(tx, { ...dto, ...calendar });
      const row = await tx.lessonSchedule.create({
        data: {
          ...calendar,
          institutionId: group.institutionId,
          groupId: group.id,
          courseId: dto.courseId,
          teacherId: dto.teacherId,
          assignmentId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          classroom: dto.classroom,
          weeklyFrequency: dto.weeklyFrequency ?? 1,
        },
        include: SCHEDULE_INCLUDE,
      });
      await syncCalendar(tx, row.id, true);
      return (await present(tx, [row]))[0];
    });
  }

  update(user: AuthenticatedUser, id: string, dto: UpdateScheduleDto) {
    return withTenant(toTenantContext(user), async (tx) => {
      const current = await tx.lessonSchedule.findUniqueOrThrow({
        where: { id },
        include: {
          group: {
            select: { id: true, institutionId: true, scholarshipProgramId: true, term: true },
          },
        },
      });
      const next = {
        ...validateCalendar(
          dto.startDate ?? current.startDate ?? current.group.term.startDate,
          dto.endDate ?? current.endDate ?? current.group.term.endDate,
          dto.breaks ?? breakRanges(current.breaks),
        ),
        id,
        groupId: current.groupId,
        teacherId: dto.teacherId ?? current.teacherId,
        dayOfWeek: dto.dayOfWeek ?? current.dayOfWeek,
        startTime: dto.startTime ?? current.startTime,
        endTime: dto.endTime ?? current.endTime,
      };
      assertTimes(next.startTime, next.endTime);
      const isActive = dto.isActive ?? current.isActive;
      const assignmentId =
        dto.teacherId || (dto.isActive && !current.isActive)
          ? await resolveAssignment(tx, next.teacherId, current.group)
          : current.assignmentId;
      if (isActive) await assertNoConflict(tx, next);
      const row = await tx.lessonSchedule.update({
        where: { id },
        data: {
          courseId: dto.courseId,
          teacherId: next.teacherId,
          assignmentId,
          dayOfWeek: next.dayOfWeek,
          startTime: next.startTime,
          endTime: next.endTime,
          classroom: dto.classroom,
          weeklyFrequency: dto.weeklyFrequency,
          startDate: next.startDate,
          endDate: next.endDate,
          breaks: next.breaks,
          isActive,
        },
        include: SCHEDULE_INCLUDE,
      });
      await syncCalendar(tx, row.id);
      return (await present(tx, [row]))[0];
    });
  }

  /** Pasiflestirir; bugunden sonraki, yoklamasi girilmemis oturumlar iptal edilir. Gecmis kalir. */
  remove(user: AuthenticatedUser, id: string) {
    return withTenant(toTenantContext(user), async (tx) => {
      await tx.lessonSchedule.update({ where: { id }, data: { isActive: false } });
      await tx.sessionOccurrence.updateMany({
        where: {
          scheduleId: id,
          date: { gte: todayInTurkey() },
          isCancelled: false,
          attendanceRecords: { none: {} },
        },
        data: { isCancelled: true, cancelReason: 'Ders programından kaldırıldı' },
      });
    });
  }
}

function assertTimes(startTime: string, endTime: string) {
  if (endTime <= startTime)
    throw new BadRequestException('Bitis saati baslangic saatinden sonra olmali');
}

async function resolveAssignment(
  tx: PrismaClient,
  teacherId: string,
  group: { institutionId: string; scholarshipProgramId: string | null },
): Promise<string | null> {
  if (!group.scholarshipProgramId) return null; // programsiz grup: hocanin ana yurdu kontrolu DB'de
  const assignment = await tx.teacherAssignment.findFirst({
    where: {
      teacherId,
      institutionId: group.institutionId,
      scholarshipProgramId: group.scholarshipProgramId,
      isActive: true,
    },
    select: { id: true },
  });
  if (!assignment) {
    throw new BadRequestException('Hoca bu yurt ve burs programina gorevlendirilmemis');
  }
  return assignment.id;
}

/**
 * Ayni hocanin veya ayni grubun ayni gun cakisan saatte aktif dersi olamaz.
 * (Yurt yoneticisi baska yurttaki dersleri RLS nedeniyle goremez; o cakismalari
 * sistem yoneticisi gorur.)
 */
async function assertNoConflict(tx: PrismaClient, slot: Slot) {
  const candidates = await tx.lessonSchedule.findMany({
    where: {
      isActive: true,
      dayOfWeek: slot.dayOfWeek,
      startTime: { lt: slot.endTime },
      endTime: { gt: slot.startTime },
      OR: [{ teacherId: slot.teacherId }, { groupId: slot.groupId }],
      ...(slot.id ? { id: { not: slot.id } } : {}),
    },
  });
  const clash = candidates.find((candidate) => {
    const start = new Date(
      Math.max(slot.startDate?.getTime() ?? 0, candidate.startDate?.getTime() ?? 0),
    );
    const end = new Date(
      Math.min(
        slot.endDate?.getTime() ?? 8640000000000000,
        candidate.endDate?.getTime() ?? 8640000000000000,
      ),
    );
    for (let day = start; day <= end; day = addDays(day, 1)) {
      if (occursOn(slot, day) && occursOn(candidate, day)) return true;
    }
    return false;
  });
  if (clash) {
    const who = clash.teacherId === slot.teacherId ? 'Hocanin' : 'Grubun';
    throw new ConflictException(
      `${who} ${DAY_NAMES[slot.dayOfWeek]} ${clash.startTime}-${clash.endTime} saatinde baska dersi var`,
    );
  }
}

async function present(tx: PrismaClient, rows: ScheduleRow[]) {
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
  return rows.map((r) => ({
    id: r.id,
    startDate: r.startDate ? formatDate(r.startDate) : null,
    endDate: r.endDate ? formatDate(r.endDate) : null,
    breaks: breakRanges(r.breaks),
    dayOfWeek: r.dayOfWeek,
    dayName: DAY_NAMES[r.dayOfWeek],
    startTime: r.startTime,
    endTime: r.endTime,
    classroom: r.classroom,
    weeklyFrequency: r.weeklyFrequency,
    isActive: r.isActive,
    group: { id: r.group.id, name: r.group.name },
    scholarshipProgram: r.group.scholarshipProgram,
    course: r.course,
    teacher: ref(r.teacherId, teachers),
    institution: ref(r.institutionId, institutions),
    assignmentId: r.assignmentId,
  }));
}
