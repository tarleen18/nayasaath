import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { MaritalStatus, VerificationType } from '@prisma/client';
import { VerificationService } from './verification.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';

class SubmitVerificationDto {
  @IsEnum(VerificationType) type!: VerificationType;
  @IsOptional() @IsEnum(MaritalStatus) claimedMaritalStatus?: MaritalStatus;
}

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  @Get('me')
  getMine(@Req() req: any) {
    if (!req.user?.id) throw new UnauthorizedException('Authentication is required.');
    return this.service.getMyCases(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() body: SubmitVerificationDto) {
    if (!req.user?.id) throw new UnauthorizedException('Authentication is required.');
    return this.service.createCase(req.user.id, body.type, body.claimedMaritalStatus);
  }
}
