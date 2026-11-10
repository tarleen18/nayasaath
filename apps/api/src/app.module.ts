import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma.service';
import { VerificationService } from './verification/verification.service';
import { VerificationController } from './verification/verification.controller';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/auth.guard';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminAuthGuard } from './admin/admin-auth.guard';
import { VerificationReviewerGuard } from './admin/verification-reviewer.guard';
import { ProfilesController } from './profiles/profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { SafetyController } from './safety/safety.controller';
import { SafetyService } from './safety/safety.service';
import { ConnectionsController } from './connections/connections.controller';
import { ConnectionsService } from './connections/connections.service';
import { EmailService } from './auth/email.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }), JwtModule.register({})],
  controllers: [HealthController, VerificationController, AuthController, AdminController, ProfilesController, SafetyController, ConnectionsController],
  providers: [PrismaService, VerificationService, AuthService, EmailService, JwtAuthGuard, AdminService, AdminAuthGuard, VerificationReviewerGuard, ProfilesService, SafetyService, ConnectionsService],
})
export class AppModule {}
