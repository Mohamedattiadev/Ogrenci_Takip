export interface NotificationSendResult {
  success: boolean;
  error?: string;
}

/** Strategy pattern: her iletisim kanali (e-posta/SMS/push) bu arayuzu uygular. */
export interface NotificationChannelSender {
  send(to: string, subject: string, message: string): Promise<NotificationSendResult>;
}
