import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PASSWORD_KEY = 'allowPendingPassword';

/** Gecici sifreyle giris yapmis (sifresini henuz degistirmemis) kullanici bu uca erisebilir. */
export const AllowPendingPassword = () => SetMetadata(ALLOW_PENDING_PASSWORD_KEY, true);
