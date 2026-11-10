import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma.service';
import { VerificationService } from '../verification/verification.service';
import { VerificationStatus, VerificationType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly verification: VerificationService) {}
  async login(emailInput: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
    if (!admin?.active || !(await argon2.verify(admin.passwordHash, password))) throw new UnauthorizedException('Invalid admin credentials.');
    await this.prisma.$transaction([
      this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.auditLog.create({ data: { actorAdminId: admin.id, action: 'ADMIN_LOGIN', resourceType: 'AdminUser', resourceId: admin.id } }),
    ]);
    const accessToken = await this.jwt.signAsync({ sub: admin.id, email: admin.email, role: admin.role, typ: 'admin' }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    return { accessToken, tokenType: 'Bearer', expiresIn: 900, admin: { id: admin.id, email: admin.email, role: admin.role } };
  }
  async queue(type?: VerificationType) {
    return this.prisma.verificationCase.findMany({ where: { ...(type ? { type } : {}), status: { in: ['PENDING', 'IN_REVIEW', 'NEEDS_INFORMATION'] } }, orderBy: { submittedAt: 'asc' }, take: 100,
      select: { id: true, type: true, status: true, claimedMaritalStatus: true, submittedAt: true, reviewerNotes: true, user: { select: { id: true, email: true, phoneE164: true, profile: { select: { displayName: true, maritalStatus: true } } } }, documents: { select: { id: true, kind: true, originalFilename: true, mimeType: true, fileSizeBytes: true, uploadedAt: true } } } });
  }
  async review(caseId: string, adminId: string, status: VerificationStatus, reason?: string) { const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { memberUserId: true } });
    return this.verification.reviewCase(caseId, adminId, status, reason, admin?.memberUserId ?? undefined); }
  async detail(caseId: string) {
    return this.prisma.verificationCase.findUnique({ where: { id: caseId }, select: { id: true, userId: true, type: true, status: true, claimedMaritalStatus: true, submittedAt: true, documents: { select: { id: true, kind: true, originalFilename: true, mimeType: true, fileSizeBytes: true, sha256: true, uploadedAt: true } }, events: { orderBy: { createdAt: 'asc' } } } });
  }
}
