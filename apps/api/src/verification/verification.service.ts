import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { VerificationStatus, VerificationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const allowedTransitions: Record<VerificationStatus, VerificationStatus[]> = {
  NOT_STARTED: ['PENDING'],
  PENDING: ['IN_REVIEW', 'NEEDS_INFORMATION'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_INFORMATION'],
  NEEDS_INFORMATION: ['PENDING', 'IN_REVIEW'],
  APPROVED: ['EXPIRED'],
  REJECTED: ['PENDING'],
  EXPIRED: ['PENDING'],
};

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createCase(userId: string, type: VerificationType, claimedMaritalStatus?: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (type === 'MARITAL_STATUS' && !profile) throw new BadRequestException('Complete your profile before submitting marital-status verification.');
    const latest = await this.prisma.verificationCase.findFirst({ where: { userId, type }, orderBy: { submittedAt: 'desc' } });
    if (latest && ['PENDING', 'IN_REVIEW', 'NEEDS_INFORMATION', 'APPROVED'].includes(latest.status)) {
      throw new BadRequestException('An active or approved verification case already exists.');
    }
    return this.prisma.verificationCase.create({
      data: {
        userId, type,
        claimedMaritalStatus: type === 'MARITAL_STATUS' ? (claimedMaritalStatus as any) : undefined,
        status: 'PENDING',
        events: { create: { actorUserId: userId, toStatus: 'PENDING', reason: 'Submitted by member' } },
      },
      select: { id: true, type: true, status: true, submittedAt: true },
    });
  }

  async getMyCases(userId: string) {
    return this.prisma.verificationCase.findMany({
      where: { userId }, orderBy: { submittedAt: 'desc' },
      select: { id: true, type: true, status: true, claimedMaritalStatus: true, submittedAt: true, reviewedAt: true, rejectionReason: true, reviewerNotes: true },
    });
  }

  async reviewCase(caseId: string, adminId: string, next: VerificationStatus, reason?: string, reviewerMemberUserId?: string) {
    const item = await this.prisma.verificationCase.findUnique({ where: { id: caseId } });
    if (!item) throw new NotFoundException('Verification case not found.');
    if (reviewerMemberUserId && item.userId === reviewerMemberUserId) throw new ForbiddenException('Self-review is prohibited.');
    if (!allowedTransitions[item.status].includes(next)) throw new BadRequestException(`Invalid verification transition: ${item.status} -> ${next}`);
    if (['REJECTED', 'NEEDS_INFORMATION'].includes(next) && !reason?.trim()) throw new BadRequestException('A clear reason is required when rejecting a case or requesting more information.');
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.verificationCase.updateMany({
        where: { id: caseId, status: item.status },
        data: { status: next, reviewerAdminId: adminId, reviewerNotes: reason?.trim() || null, reviewedAt: ['APPROVED', 'REJECTED'].includes(next) ? new Date() : undefined, rejectionReason: next === 'REJECTED' ? reason : null },
      });
      if (changed.count !== 1) throw new ConflictException('This case was changed by another reviewer. Refresh the queue and try again.');
      const updated = await tx.verificationCase.findUniqueOrThrow({ where: { id: caseId }, select: { id: true, type: true, status: true, reviewedAt: true } });
      await tx.verificationEvent.create({ data: { caseId, actorAdminId: adminId, fromStatus: item.status, toStatus: next, reason } });
      await tx.auditLog.create({ data: { actorAdminId: adminId, action: 'VERIFICATION_STATUS_CHANGED', resourceType: 'VerificationCase', resourceId: caseId, metadata: { from: item.status, to: next } } });
      return updated;
    });
  }
}
