import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';

const windowMs = 15 * 60_000;
const limits: Record<string, number> = {
  register: 5,
  login: 10,
  'email/verify': 10,
  'email/resend': 3,
  'password/forgot': 3,
  'password/reset': 10,
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private lastCleanupAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.path.replace(/^\/api\/v1\/auth\//, '').replace(/\/$/, '');
    const limit = limits[route];
    if (!limit) return true;

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is required for authentication rate limiting.');

    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const bucket = createHmac('sha256', secret)
      .update(`${route}:${request.ip}:${window}`)
      .digest('hex');
    const expiresAt = new Date((window + 1) * windowMs);
    const entry = await this.prisma.authRateLimit.upsert({
      where: { bucket },
      create: { bucket, attempts: 1, expiresAt },
      update: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    if (now - this.lastCleanupAt >= windowMs) {
      await this.prisma.authRateLimit.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
      this.lastCleanupAt = now;
    }

    if (entry.attempts > limit) {
      throw new HttpException('Too many requests. Please wait before trying again.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
