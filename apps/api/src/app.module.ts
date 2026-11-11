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
import { PrivateProfilesController } from './profiles/private-profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { SafetyController } from './safety/safety.controller';
import { SafetyService } from './safety/safety.service';
import { ConnectionsController } from './connections/connections.controller';
import { ConnectionsService } from './connections/connections.service';
import { EmailService } from './auth/email.service';
import { AuthRateLimitGuard } from './auth/auth-rate-limit.guard';
import { PublicLaunchGuard } from './public-launch.guard';

const authOnlyMode = process.env.AUTH_ONLY_MODE === 'true';
const privateProfileMode = process.env.PRIVATE_PROFILE_MODE === 'true';
if (privateProfileMode && !authOnlyMode) {
  throw new Error('PRIVATE_PROFILE_MODE=true requires AUTH_ONLY_MODE=true.');
}
const authOnlyControllers = [
  HealthController,
  AuthController,
  ...(privateProfileMode ? [PrivateProfilesController] : []),
];
const fullApiControllers = [
  HealthController,
  VerificationController,
  AuthController,
  AdminController,
  ProfilesController,
  SafetyController,
  ConnectionsController,
];
const authOnlyProviders = [PrismaService, AuthService, EmailService, JwtAuthGuard, AuthRateLimitGuard, PublicLaunchGuard];
const privateProfileProviders = privateProfileMode ? [ProfilesService] : [];
const fullApiProviders = [
  ...authOnlyProviders,
  VerificationService,
  AdminService,
  AdminAuthGuard,
  VerificationReviewerGuard,
  ProfilesService,
  SafetyService,
  ConnectionsService,
];

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }), JwtModule.register({})],
  controllers: authOnlyMode ? authOnlyControllers : fullApiControllers,
  providers: authOnlyMode
    ? [...authOnlyProviders, ...privateProfileProviders]
    : fullApiProviders,
})
export class AppModule {}
