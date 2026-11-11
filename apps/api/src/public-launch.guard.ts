import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class PublicLaunchGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.PUBLIC_SITE_ONLY === 'true') {
      throw new ServiceUnavailableException('Member registration and profile editing are paused while NayaSaath prepares its launch.');
    }
    return true;
  }
}
