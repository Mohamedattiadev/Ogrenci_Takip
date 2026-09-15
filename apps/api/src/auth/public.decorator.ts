import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Bu endpoint icin JWT dogrulamasi atlanir (ör. login, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
