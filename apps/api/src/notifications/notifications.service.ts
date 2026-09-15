import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationChannel,
  NotificationStatus,
  withTenant,
  type TenantContext,
} from '@yoklama/db';
import {
  ATTENDANCE_ABSENCE_EVENT,
  AttendanceAbsenceEvent,
} from '../attendance/events/attendance-absence.event';
import { EmailNotificationChannel } from './channels/email-channel';
import { SmsNotificationChannel } from './channels/sms-channel';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const ABSENCE_ALERT_THRESHOLD = Number(process.env.ABSENCE_ALERT_THRESHOLD ?? 3);

const STATUS_LABELS: Record<string, string> = {
  ABSENT: 'devamsız',
  ABSENT_EXCUSED: 'haberli devamsız',
  ABSENT_UNEXCUSED: 'habersiz devamsız',
};

/** Sistem tetikli islemler icin: gercek bir kullanicinin degil, olay-guduml bir arka plan islemin context'i. */
function systemContext(institutionId: string): TenantContext {
  return { institutionId, actorId: SYSTEM_ACTOR_ID, isSuperAdmin: true };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly email: EmailNotificationChannel,
    private readonly sms: SmsNotificationChannel,
  ) {}

  @OnEvent(ATTENDANCE_ABSENCE_EVENT)
  async handleAbsence(event: AttendanceAbsenceEvent) {
    const ctx = systemContext(event.institutionId);
    const dateStr = event.sessionDate.toLocaleDateString('tr-TR');
    const label = STATUS_LABELS[event.status] ?? 'devamsız';

    await withTenant(ctx, async (tx) => {
      const student = await tx.student.findUnique({ where: { id: event.studentId } });
      if (!student) return;

      await this.dispatch(
        ctx,
        student,
        `${student.firstName} ${student.lastName} adlı öğrenci ${dateStr} tarihinde ${label} olarak işaretlendi.`,
      );

      if (event.status === 'ABSENT_UNEXCUSED') {
        const total = await tx.attendanceRecord.count({
          where: { studentId: event.studentId, status: 'ABSENT_UNEXCUSED' },
        });
        if (total > 0 && total % ABSENCE_ALERT_THRESHOLD === 0) {
          await this.dispatch(
            ctx,
            student,
            `Dikkat: ${student.firstName} ${student.lastName} adlı öğrencinin toplam habersiz devamsızlık sayısı ${total}'e ulaştı.`,
          );
        }
      }
    });
  }

  private async dispatch(
    ctx: TenantContext,
    student: { id: string; guardianEmail: string | null; guardianPhone: string | null },
    message: string,
  ) {
    const channel = student.guardianEmail
      ? NotificationChannel.EMAIL
      : student.guardianPhone
        ? NotificationChannel.SMS
        : null;
    if (!channel) {
      this.logger.debug(`Ogrenci ${student.id} icin veli iletisim bilgisi yok, bildirim atlandi.`);
      return;
    }

    const sender = channel === NotificationChannel.EMAIL ? this.email : this.sms;
    const to =
      channel === NotificationChannel.EMAIL ? student.guardianEmail! : student.guardianPhone!;
    const result = await sender.send(to, 'Devamsızlık Bildirimi', message);

    await withTenant(ctx, (tx) =>
      tx.notification.create({
        data: {
          institutionId: ctx.institutionId!,
          studentId: student.id,
          channel,
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          message,
          error: result.error,
          sentAt: result.success ? new Date() : null,
        },
      }),
    );
  }

  findAll(ctx: TenantContext) {
    return withTenant(ctx, (tx) =>
      tx.notification.findMany({
        include: { student: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  }
}
