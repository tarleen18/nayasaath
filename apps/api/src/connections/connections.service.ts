import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InterestStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureNotBlocked(a: string, b: string) {
    const block = await this.prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] }, select: { id: true } });
    if (block) throw new ForbiddenException('This interaction is unavailable.');
  }

  async sendInterest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new BadRequestException('You cannot send interest to yourself.');
    await this.ensureNotBlocked(senderId, receiverId);
    const sender = await this.prisma.user.findFirst({ where: { id: senderId, status: 'ACTIVE', profile: { is: { profileVisible: true } } }, select: { id: true } });
    if (!sender) throw new BadRequestException('Publish your profile before sending interest.');
    const receiver = await this.prisma.user.findFirst({ where: { id: receiverId, status: 'ACTIVE', profile: { is: { profileVisible: true } } }, select: { id: true } });
    if (!receiver) throw new NotFoundException('Member is not available.');
    const existing = await this.prisma.interest.findUnique({ where: { senderId_receiverId: { senderId, receiverId } } });
    if (existing && existing.status !== 'WITHDRAWN') throw new ConflictException('An interest request already exists for this member.');
    const interest = existing
      ? await this.prisma.interest.update({ where: { id: existing.id }, data: { status: InterestStatus.PENDING }, select: { id: true, status: true, createdAt: true } })
      : await this.prisma.interest.create({ data: { senderId, receiverId }, select: { id: true, status: true, createdAt: true } });
    return { interest };
  }

  async listInterests(userId: string, direction: 'incoming' | 'outgoing') {
    const rows = await this.prisma.interest.findMany({
      where: direction === 'incoming' ? { receiverId: userId } : { senderId: userId },
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, status: true, createdAt: true, sender: { select: { id: true, profile: { select: { displayName: true, city: true, maritalStatus: true } } } }, receiver: { select: { id: true, profile: { select: { displayName: true, city: true, maritalStatus: true } } } } },
    });
    const otherIds = rows.map((r) => direction === 'incoming' ? r.sender.id : r.receiver.id);
    const blocks = await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId, blockedId: { in: otherIds } }, { blockerId: { in: otherIds }, blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    const hidden = new Set(blocks.map((b) => b.blockerId === userId ? b.blockedId : b.blockerId));
    return { interests: rows.filter((r) => !hidden.has(direction === 'incoming' ? r.sender.id : r.receiver.id)) };
  }

  async respond(userId: string, interestId: string, status: 'ACCEPTED' | 'DECLINED') {
    const interest = await this.prisma.interest.findUnique({ where: { id: interestId } });
    if (!interest || interest.receiverId !== userId) throw new NotFoundException('Interest request not found.');
    if (interest.status !== 'PENDING') throw new BadRequestException('This request has already been answered.');
    await this.ensureNotBlocked(interest.senderId, interest.receiverId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.interest.updateMany({ where: { id: interestId, receiverId: userId, status: 'PENDING' }, data: { status } });
      if (changed.count !== 1) throw new BadRequestException('This request has already been answered.');
      if (status === 'ACCEPTED') {
        const [memberAId, memberBId] = [interest.senderId, interest.receiverId].sort();
        await tx.conversation.upsert({ where: { memberAId_memberBId: { memberAId, memberBId } }, create: { memberAId, memberBId }, update: {} });
      }
      return tx.interest.findUniqueOrThrow({ where: { id: interestId }, select: { id: true, status: true } });
    });
    return { interest: updated };
  }

  async conversations(userId: string) {
    const rows = await this.prisma.conversation.findMany({ where: { OR: [{ memberAId: userId }, { memberBId: userId }] }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, createdAt: true, memberAId: true, memberBId: true, messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, createdAt: true, senderId: true } } },
    });
    const otherIds = rows.map((r) => r.memberAId === userId ? r.memberBId : r.memberAId);
    const blocked = await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId, blockedId: { in: otherIds } }, { blockerId: { in: otherIds }, blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    const hidden = new Set(blocked.map((b) => b.blockerId === userId ? b.blockedId : b.blockerId));
    return { conversations: rows.filter((r) => !hidden.has(r.memberAId === userId ? r.memberBId : r.memberAId)).map((r) => ({ id: r.id, createdAt: r.createdAt, otherMemberId: r.memberAId === userId ? r.memberBId : r.memberAId, latestMessage: r.messages[0] ?? null })) };
  }

  async messages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true, memberAId: true, memberBId: true } });
    if (!conversation || (conversation.memberAId !== userId && conversation.memberBId !== userId)) throw new NotFoundException('Conversation not found.');
    const other = conversation.memberAId === userId ? conversation.memberBId : conversation.memberAId;
    await this.ensureNotBlocked(userId, other);
    const messages = (await this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, senderId: true, body: true, createdAt: true, readAt: true } })).reverse();
    await this.prisma.message.updateMany({ where: { conversationId, senderId: other, readAt: null }, data: { readAt: new Date() } });
    return { messages };
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { id: true, memberAId: true, memberBId: true } });
    if (!conversation || (conversation.memberAId !== userId && conversation.memberBId !== userId)) throw new NotFoundException('Conversation not found.');
    const other = conversation.memberAId === userId ? conversation.memberBId : conversation.memberAId;
    await this.ensureNotBlocked(userId, other);
    const message = await this.prisma.message.create({ data: { conversationId, senderId: userId, body: body.trim() }, select: { id: true, senderId: true, body: true, createdAt: true } });
    return { message };
  }
}
