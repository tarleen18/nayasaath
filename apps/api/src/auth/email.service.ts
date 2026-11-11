import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  assertConfigured(): void {
    const provider = process.env.EMAIL_PROVIDER;
    const usesResendApi = provider === 'resend' || process.env.SMTP_HOST === 'smtp.resend.com';
    if (!process.env.EMAIL_FROM) {
      throw new ServiceUnavailableException('Email verification is not configured. Please try again later.');
    }
    if (usesResendApi && (process.env.RESEND_API_KEY || process.env.SMTP_PASSWORD)) return;
    const port = Number(process.env.SMTP_PORT);
    if (
      provider !== 'smtp' ||
      !process.env.SMTP_HOST ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)
    ) {
      throw new ServiceUnavailableException('Email verification is not configured. Please try again later.');
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    this.assertConfigured();

    const text = `Your NayaSaath email verification code is ${code}.\n\nIt expires in 30 minutes and can only be used once. If you did not request this, you can ignore this message.`;
    const html = `<p>Your NayaSaath email verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 30 minutes and can only be used once. If you did not request this, you can ignore this message.</p>`;
    if (process.env.EMAIL_PROVIDER === 'resend' || process.env.SMTP_HOST === 'smtp.resend.com') {
      try {
        const apiKey = process.env.RESEND_API_KEY ?? process.env.SMTP_PASSWORD;
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [email],
            subject: 'Your NayaSaath verification code',
            text,
            html,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          this.logger.error(`Resend rejected an email verification message (HTTP ${response.status}).`);
          throw new ServiceUnavailableException('Unable to send the verification email. Please try again later.');
        }
        return;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        this.logger.error('Failed to deliver an email verification message through Resend.', error instanceof Error ? error.stack : undefined);
        throw new ServiceUnavailableException('Unable to send the verification email. Please try again later.');
      }
    }

    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT);
    const secure = process.env.SMTP_SECURE === 'true';

    const auth = process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD! }
      : undefined;
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(auth ? { auth } : {}),
      ...(!secure && !['localhost', '127.0.0.1', '::1'].includes(host) ? { requireTLS: true } : {}),
    });

    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your NayaSaath verification code',
        text,
        html,
      });
    } catch (error) {
      this.logger.error('Failed to deliver an email verification message.', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Unable to send the verification email. Please try again later.');
    } finally {
      transport.close();
    }
  }
}
