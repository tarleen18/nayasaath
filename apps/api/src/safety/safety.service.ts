import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException('You cannot block your own account.');
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) throw new NotFoundException('Member not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } }, create: { blockerId: userId, blockedId: targetUserId }, update: {} });
      await tx.interest.updateMany({ where: { OR: [{ senderId: userId, receiverId: targetUserId }, { senderId: targetUserId, receiverId: userId }], status: 'PENDING' }, data: { status: 'WITHDRAWN' } });
      await tx.auditLog.create({ data: { actorUserId: userId, action: 'MEMBER_BLOCKED', resourceType: 'USER', resourceId: targetUserId } });
    });
    return { blocked: true, message: 'This member is now blocked. They will not appear in your discovery results.' };
  }

  async unblock(userId: string, targetUserId: string) {
    const result = await this.prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetUserId } });
    if (result.count) await this.prisma.auditLog.create({ data: { actorUserId: userId, action: 'MEMBER_UNBLOCKED', resourceType: 'USER', resourceId: targetUserId } });
    return { unblocked: result.count > 0 };
  }

  async listBlocks(userId: string) {
    const blocks = await this.prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: 'desc' }, select: { blockedId: true, createdAt: true } });
    return { blocks };
  }

  async report(userId: string, targetUserId: string, category: string, description: string) {
    if (userId === targetUserId) throw new BadRequestException('You cannot report your own account.');
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) throw new NotFoundException('Member not found.');
    const report = await this.prisma.report.create({ data: { reporterId: userId, reportedUserId: targetUserId, category, description: description.trim() } });
    await this.prisma.auditLog.create({ data: { actorUserId: userId, action: 'MEMBER_REPORTED', resourceType: 'REPORT', resourceId: report.id, metadata: { category } } });
    return { reportId: report.id, status: report.status, message: 'Your report has been received for review. If you feel in immediate danger, contact local emergency services.' };
  }
}
