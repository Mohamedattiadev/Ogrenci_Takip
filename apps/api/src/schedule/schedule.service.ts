import { Injectable, NotFoundException } from '@nestjs/common';
import { withTenant, type TenantContext } from '@yoklama/db';
import type {
  CancelOccurrenceDto,
  CreateHolidayDto,
  CreateScheduleDto,
  GenerateOccurrencesDto,
} from './dto/schedule.dto';

@Injectable()
export class ScheduleService {
  createSchedule(ctx: TenantContext, dto: CreateScheduleDto) {
    if (!ctx.institutionId) throw new NotFoundException('Kurum secilmedi');
    return withTenant(ctx, (tx) =>
      tx.lessonSchedule.create({
        data: {
          ...dto,
          weeklyFrequency: dto.weeklyFrequency ?? 1,
          institutionId: ctx.institutionId!,
        },
      }),
    );
  }

  findAll(ctx: TenantContext, teacherId?: string, groupId?: string) {
    return withTenant(ctx, (tx) =>
      tx.lessonSchedule.findMany({
        where: {
          isActive: true,
          ...(teacherId ? { teacherId } : {}),
          ...(groupId ? { groupId } : {}),
        },
        include: { course: true, group: true },
      }),
    );
  }

  /** Ogretmenin bugunku derslerini dondurur - mobil "bugunku dersler" ekrani icin. */
  async todaysSessionsForTeacher(ctx: TenantContext, teacherId: string, date: Date) {
    return withTenant(ctx, async (tx) => {
      const dayOfWeek = (date.getDay() + 6) % 7; // JS: 0=Pazar -> bizim semada 0=Pazartesi
      const schedules = await tx.lessonSchedule.findMany({
        where: { teacherId, dayOfWeek, isActive: true },
        include: { course: true, group: true },
      });
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return Promise.all(
        schedules.map(async (schedule) => {
          const occurrence = await tx.sessionOccurrence.findFirst({
            where: { scheduleId: schedule.id, date: { gte: startOfDay, lte: endOfDay } },
          });
          return { schedule, occurrence };
        }),
      );
    });
  }

  /** Program sablonundan, belirtilen tarih araligi icin somut ders gunleri uretir (tatiller haric). */
  async generateOccurrences(ctx: TenantContext, scheduleId: string, dto: GenerateOccurrencesDto) {
    return withTenant(ctx, async (tx) => {
      const schedule = await tx.lessonSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
      const holidays = await tx.holiday.findMany({
        where: { date: { gte: new Date(dto.from), lte: new Date(dto.to) } },
      });
      const holidayDates = new Set(holidays.map((h) => h.date.toDateString()));

      const created = [];
      const cursor = new Date(dto.from);
      const end = new Date(dto.to);
      while (cursor <= end) {
        const dayOfWeek = (cursor.getDay() + 6) % 7;
        if (dayOfWeek === schedule.dayOfWeek && !holidayDates.has(cursor.toDateString())) {
          const occurrence = await tx.sessionOccurrence.upsert({
            where: { scheduleId_date: { scheduleId, date: new Date(cursor) } },
            update: {},
            create: { scheduleId, date: new Date(cursor) },
          });
          created.push(occurrence);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return created;
    });
  }

  cancelOccurrence(ctx: TenantContext, occurrenceId: string, dto: CancelOccurrenceDto) {
    return withTenant(ctx, (tx) =>
      tx.sessionOccurrence.update({
        where: { id: occurrenceId },
        data: { isCancelled: true, cancelReason: dto.reason },
      }),
    );
  }

  createMakeup(ctx: TenantContext, scheduleId: string, date: string) {
    return withTenant(ctx, (tx) =>
      tx.sessionOccurrence.create({ data: { scheduleId, date: new Date(date), isMakeup: true } }),
    );
  }

  createHoliday(ctx: TenantContext, dto: CreateHolidayDto) {
    return withTenant(ctx, (tx) =>
      tx.holiday.create({
        data: {
          date: new Date(dto.date),
          description: dto.description,
          institutionId: dto.allInstitutions ? null : ctx.institutionId,
        },
      }),
    );
  }

  listHolidays(ctx: TenantContext) {
    return withTenant(ctx, (tx) => tx.holiday.findMany({ orderBy: { date: 'asc' } }));
  }
}
