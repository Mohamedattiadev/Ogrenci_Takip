import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from './ability.factory';
import { CHECK_POLICIES_KEY, type PolicyHandler } from './check-policies.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const handlers = this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handlers || handlers.length === 0) return true; // policy tanimlanmamissa sadece auth yeterli

    const request = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.createForUser(request.user);

    const allowed = handlers.every((handler) => handler(ability));
    if (!allowed) throw new ForbiddenException('Bu islem icin yetkiniz yok');
    return true;
  }
}
