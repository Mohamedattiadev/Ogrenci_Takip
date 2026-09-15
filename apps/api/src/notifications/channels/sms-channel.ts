import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationChannelSender,
  NotificationSendResult,
} from './notification-channel.interface';

/**
 * YER TUTUCU: TDV bir SMS saglayicisi (ör. Netgsm, Turkcell, Iletimerkezi)
 * secip API bilgilerini paylastiginda burasi gercek bir HTTP cagrisina
 * donusturulur - geri kalan sistem (tetikleme mantigi, Notification kaydi,
 * esik kontrolu) hic degismez, cunku hepsi bu arayuz (NotificationChannelSender)
 * uzerinden konusuyor. Su an icin gonderimi sadece loglar, gercek SMS atmaz.
 */
@Injectable()
export class SmsNotificationChannel implements NotificationChannelSender {
  private readonly logger = new Logger(SmsNotificationChannel.name);

  async send(to: string, _subject: string, message: string): Promise<NotificationSendResult> {
    this.logger.warn(
      `[SMS SAGLAYICISI BAGLANMADI - yer tutucu] ${to} numarasina gonderilecekti: "${message}"`,
    );
    return {
      success: false,
      error: 'SMS saglayicisi henuz baglanmadi (TDV saglayici secimi bekleniyor)',
    };
  }
}
