import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type {
  NotificationChannelSender,
  NotificationSendResult,
} from './notification-channel.interface';

/**
 * Duz SMTP - hangi saglayici kullanilirsa kullanilsin (TDV'nin kendi sunucusu,
 * bir kurumsal e-posta hizmeti, vs.) SMTP_HOST/PORT/USER/PASS degismesi
 * yeterli, kod degismez. SMTP_HOST tanimli degilse (ör. yerel gelistirme)
 * gonderim yapilmaz, sadece loglanir - boylece gelistirme ortami gercek bir
 * posta sunucusu gerektirmez.
 */
@Injectable()
export class EmailNotificationChannel implements NotificationChannelSender {
  private readonly logger = new Logger(EmailNotificationChannel.name);
  private readonly transporter: Transporter | null;

  constructor() {
    this.transporter = process.env.SMTP_HOST
      ? createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        })
      : null;
  }

  async send(to: string, subject: string, message: string): Promise<NotificationSendResult> {
    if (!this.transporter) {
      this.logger.warn(`SMTP yapilandirilmadi - e-posta gonderilmedi (alici: ${to}): ${message}`);
      return { success: false, error: 'SMTP yapilandirilmadi' };
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'yoklama@example.org',
        to,
        subject,
        text: message,
      });
      return { success: true };
    } catch (err) {
      this.logger.error(`E-posta gonderilemedi: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }
}
