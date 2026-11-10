import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { isEmailAllowed } from './email-access-policy';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Bearer access token required.');
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (payload.typ !== 'access' || !payload.sub) throw new Error('Invalid token type');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, status: true, emailVerifiedAt: true } });
      if (
        !user ||
        !user.email ||
        !user.emailVerifiedAt ||
        !isEmailAllowed(user.email) ||
        !['ACTIVE', 'PAUSED'].includes(user.status)
      ) throw new Error('Account inactive');
      request.user = { id: user.id, email: user.email, status: user.status };
      return true;
    } catch { throw new UnauthorizedException('Invalid token or account unavailable.'); }
  }
}
