import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEmailAccessLists } from './auth/email-access-policy';
import { EmailService } from './auth/email.service';

async function bootstrap() {
  validateEmailAccessLists();
  const isProduction = process.env.NODE_ENV === 'production';
  const webOrigins = (process.env.WEB_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (isProduction) {
    if (process.env.AUTH_ONLY_MODE !== 'true') {
      throw new Error('Production launch blocked: set AUTH_ONLY_MODE=true until all production launch gates for the full API are complete.');
    }
    for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'EMAIL_FROM']) {
      if (!process.env[key]) throw new Error(`Missing required production environment variable: ${key}`);
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      if ((process.env[key] ?? '').length < 32) throw new Error(`${key} must contain at least 32 characters.`);
    }
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
    }
    if (process.env.EMAIL_PROVIDER === 'smtp' && process.env.SMTP_SECURE !== 'true') {
      throw new Error('Production SMTP email must use TLS.');
    }
    if (!['smtp', 'resend'].includes(process.env.EMAIL_PROVIDER ?? '')) {
      throw new Error('Production email must use the Resend API or an authenticated SMTP provider.');
    }
    if (!webOrigins.length || webOrigins.some((origin) => {
      try {
        const parsed = new URL(origin);
        return parsed.protocol !== 'https:' || parsed.origin !== origin;
      } catch {
        return true;
      }
    })) {
      throw new Error('WEB_ORIGIN must contain one or more exact HTTPS origins separated by commas.');
    }
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  if (isProduction) app.get(EmailService).assertConfigured();
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: isProduction ? webOrigins : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
