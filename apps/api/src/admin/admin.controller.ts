import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VerificationType } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminLoginDto, ReviewDto, VerificationQueueQueryDto } from './admin.dto';
import { AdminAuthGuard } from './admin-auth.guard';
import { VerificationReviewerGuard } from './verification-reviewer.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Post('auth/login') login(@Body() body: AdminLoginDto) { return this.service.login(body.email, body.password); }
  @Get('verification-queue') @UseGuards(AdminAuthGuard, VerificationReviewerGuard)
  queue(@Query() query: VerificationQueueQueryDto) { return this.service.queue(query.type); }
  @Get('verification-cases/:id') @UseGuards(AdminAuthGuard, VerificationReviewerGuard)
  detail(@Param('id') id: string) { return this.service.detail(id); }
  @Post('verification-cases/:id/review') @UseGuards(AdminAuthGuard, VerificationReviewerGuard)
  review(@Param('id') id: string, @Req() req: any, @Body() body: ReviewDto) { return this.service.review(id, req.admin.id, body.status, body.reason); }
}
