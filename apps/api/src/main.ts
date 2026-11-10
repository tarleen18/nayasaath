import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEmailAccessLists } from './auth/email-access-policy';

async function bootstrap() {
  validateEmailAccessLists();
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['DATABASE_URL', 'JWT_ACCESS_SECRET']) {
      if (!process.env[key]) throw new Error(`Missing required production environment variable: ${key}`);
    }
    if ((process.env.JWT_ACCESS_SECRET ?? '').length < 32) throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
    throw new Error('Production launch blocked: production SMTP deliverability, OTP/SMS delivery, KYC, private document storage, distributed rate limiting and payment adapters are not yet implemented and independently tested.');
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? (process.env.WEB_ORIGIN ?? '').split(',').filter(Boolean) : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
