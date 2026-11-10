import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class VerificationReviewerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const role = context.switchToHttp().getRequest().admin?.role;
    if (!['SUPER_ADMIN', 'VERIFICATION_REVIEWER'].includes(role)) throw new ForbiddenException('Verification reviewer permission required.');
    return true;
  }
}
