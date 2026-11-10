import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import { isEmailAllowed } from './email-access-policy';

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const verificationNotice = 'If this address can be registered, a verification code will be sent.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private async issue(user: { id: string; email: string | null }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, typ: 'access' }, {
      secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m',
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshSession.create({ data: {
      userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + 30 * 86400_000),
    } });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 };
  }

  async register(emailInput: string, password: string, phoneE164?: string) {
    const email = emailInput.trim().toLowerCase();
    if (!isEmailAllowed(email)) return { success: true, notice: verificationNotice };
    this.emailService.assertConfigured();
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    let user: { id: string };
    try {
      user = await this.prisma.user.create({
        data: { email, phoneE164, passwordHash, status: 'PENDING' },
        select: { id: true, email: true },
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        await this.resendVerification(email);
        return { success: true, notice: verificationNotice };
      }
      throw error;
    }
    await this.sendVerification(user.id, email);
    return { success: true, notice: verificationNotice };
  }

  async login(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    if (!isEmailAllowed(email)) throw new UnauthorizedException('Invalid email or password.');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) throw new UnauthorizedException('Invalid email or password.');
    if (!user.emailVerifiedAt) throw new ForbiddenException('Verify your email address before signing in. You can request a new verification email.');
    if (['SUSPENDED', 'DELETED', 'DELETION_REQUESTED'].includes(user.status)) throw new UnauthorizedException('This account cannot sign in. Contact support if you believe this is an error.');
    if (!['ACTIVE', 'PAUSED'].includes(user.status)) throw new UnauthorizedException('This account cannot sign in.');
    return { user: { id: user.id, email: user.email, status: user.status }, ...(await this.issue(user)) };
  }

  async refresh(token: string) {
    const tokenHash = hashToken(token);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('Refresh token is invalid or expired.');
    if (!session.user.email || !isEmailAllowed(session.user.email) || !session.user.emailVerifiedAt) {
      throw new UnauthorizedException('This account is not permitted to sign in.');
    }
    if (!['ACTIVE', 'PAUSED'].includes(session.user.status)) throw new UnauthorizedException('This account cannot sign in.');
    // Rotate atomically: a refresh token can only be used once.
    const changed = await this.prisma.refreshSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (changed.count !== 1) throw new UnauthorizedException('Refresh token has already been used.');
    return { user: { id: session.user.id, email: session.user.email, status: session.user.status }, ...(await this.issue(session.user)) };
  }

  async logout(token: string) {
    await this.prisma.refreshSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async verifyEmail(emailInput: string, code: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true, status: true },
    });
    const challenge = user && await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !user ||
      !challenge ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= 5 ||
      user.emailVerifiedAt ||
      user.status !== 'PENDING' ||
      !isEmailAllowed(email)
    ) {
      throw new BadRequestException('The verification code is invalid or expired. Request a new one.');
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new ServiceUnavailableException('Email verification is not configured. Please try again later.');
    const suppliedHash = createHmac('sha256', secret).update(`${user.id}:${code}`).digest('hex');
    const suppliedBytes = Buffer.from(suppliedHash, 'hex');
    const expectedBytes = Buffer.from(challenge.tokenHash, 'hex');
    const matches = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
    if (!matches) {
      const now = new Date();
      await this.prisma.emailVerificationToken.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: now }, attempts: challenge.attempts },
        data: {
          attempts: { increment: 1 },
          ...(challenge.attempts === 4 ? { consumedAt: now } : {}),
        },
      });
      throw new BadRequestException('The verification code is invalid or expired.');
    }

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new BadRequestException('This verification code has already been used.');
      const activated = await tx.user.updateMany({
        where: { id: user.id, emailVerifiedAt: null, status: 'PENDING' },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
      if (activated.count !== 1) throw new BadRequestException('This account cannot be activated.');
    });
    return { success: true, verified: true, notice: 'Email verified. You can now sign in.' };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    if (!isEmailAllowed(email)) return { success: true, notice: verificationNotice };

    this.emailService.assertConfigured();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true, status: true },
    });
    if (!user || user.emailVerifiedAt || user.status !== 'PENDING') {
      return { success: true, notice: verificationNotice };
    }

    const cooldownStart = new Date(Date.now() - 60_000);
    const recentToken = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, createdAt: { gt: cooldownStart } },
      select: { id: true },
    });
    if (recentToken) return { success: true, notice: verificationNotice };

    await this.sendVerification(user.id, email);
    return { success: true, notice: verificationNotice };
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const code = String(randomInt(100000, 1000000));
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new ServiceUnavailableException('Email verification is not configured. Please try again later.');
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex'),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      }),
    ]);
    await this.emailService.sendVerificationEmail(email, code);
  }

  async requestOtp(userId: string, channel: 'email' | 'phone') {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, phoneE164: true } });
    if (!user) throw new UnauthorizedException();
    const destination = channel === 'email' ? user.email : user.phoneE164;
    if (!destination) throw new BadRequestException(`Add a ${channel} address to your account first.`);
    // A real provider must be configured before production verification can be enabled.
    if (process.env.NODE_ENV === 'production') {
      const enabled = channel === 'email' ? process.env.EMAIL_PROVIDER !== 'disabled' : process.env.SMS_PROVIDER !== 'disabled';
      if (!enabled) throw new ServiceUnavailableException('Verification delivery is not configured yet. Please try again later.');
      throw new ServiceUnavailableException('The configured delivery adapter is not implemented. Verification has not been sent.');
    }
    const code = process.env.OTP_DEV_FIXED_CODE || String(randomInt(100000, 1000000));
    const purpose = channel === 'email' ? 'VERIFY_EMAIL' : 'VERIFY_PHONE';
    const secret = process.env.JWT_ACCESS_SECRET || 'local-development-only-secret';
    const codeHash = createHmac('sha256', secret).update(`${userId}:${purpose}:${code}`).digest('hex');
    await this.prisma.$transaction([
      this.prisma.otpChallenge.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.otpChallenge.create({ data: { userId, purpose, destination, codeHash, expiresAt: new Date(Date.now() + 5 * 60_000) } }),
    ]);
    return { success: true, expiresInSeconds: 300, delivery: 'development-only', notice: 'No email or SMS was sent. Use the development OTP configured by the operator.' };
  }

  async verifyOtp(userId: string, channel: 'email' | 'phone', code: string) {
    if (!/^\d{6}$/.test(code)) throw new BadRequestException('Enter the six-digit code.');
    const purpose = channel === 'email' ? 'VERIFY_EMAIL' : 'VERIFY_PHONE';
    const challenge = await this.prisma.otpChallenge.findFirst({ where: { userId, purpose, consumedAt: null }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= 5) throw new BadRequestException('Code is invalid or expired. Request a new code.');
    const secret = process.env.JWT_ACCESS_SECRET || 'local-development-only-secret';
    const supplied = createHmac('sha256', secret).update(`${userId}:${purpose}:${code}`).digest('hex');
    const suppliedBytes = Buffer.from(supplied, 'hex');
    const expectedBytes = Buffer.from(challenge.codeHash, 'hex');
    const matches = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
    if (!matches) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Code is invalid or expired.');
    }
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attempts: { lt: 5 } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new BadRequestException('Code has already been used.');
      await tx.user.update({ where: { id: userId }, data: channel === 'email' ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() } });
    });
    return { success: true, verified: channel };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phoneE164: true, status: true, phoneVerifiedAt: true, emailVerifiedAt: true, createdAt: true } });
  }
}
