import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Admin bearer token required.');
    try {
      const p = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET });
      if (p.typ !== 'admin' || !p.sub) throw new Error('Invalid admin token');
      const admin = await this.prisma.adminUser.findUnique({ where: { id: p.sub }, select: { id: true, email: true, role: true, active: true } });
      if (!admin?.active) throw new Error('Admin inactive');
      req.admin = { id: admin.id, email: admin.email, role: admin.role };
      return true;
    } catch { throw new UnauthorizedException('Invalid, expired or disabled admin token.'); }
  }
}
