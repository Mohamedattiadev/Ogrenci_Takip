import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailNotificationChannel } from './channels/email-channel';
import { SmsNotificationChannel } from './channels/sms-channel';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailNotificationChannel, SmsNotificationChannel],
})
export class NotificationsModule {}
