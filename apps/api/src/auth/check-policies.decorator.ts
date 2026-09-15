import { SetMetadata } from '@nestjs/common';
import type { AppAbility } from './ability.factory';

export const CHECK_POLICIES_KEY = 'check_policies';
export type PolicyHandler = (ability: AppAbility) => boolean;

/** ör: @CheckPolicies((a) => a.can('update', 'AttendanceRecord')) */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
