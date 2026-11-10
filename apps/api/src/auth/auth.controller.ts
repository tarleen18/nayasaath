import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { EmailAddressDto, LoginDto, RefreshDto, RegisterDto, RequestOtpDto, VerifyEmailDto, VerifyOtpDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() body: RegisterDto) { return this.auth.register(body.email, body.password, body.phoneE164); }
  @Post('email/verify') verifyEmail(@Body() body: VerifyEmailDto) { return this.auth.verifyEmail(body.email, body.code); }
  @Post('email/resend') resendVerification(@Body() body: EmailAddressDto) { return this.auth.resendVerification(body.email); }
  @Post('login') login(@Body() body: LoginDto) { return this.auth.login(body.email, body.password); }
  @Post('refresh') refresh(@Body() body: RefreshDto) { return this.auth.refresh(body.refreshToken); }
  @Post('logout') logout(@Body() body: RefreshDto) { return this.auth.logout(body.refreshToken); }
  @Post('otp/request') @UseGuards(JwtAuthGuard) requestOtp(@Req() req: any, @Body() body: RequestOtpDto) { return this.auth.requestOtp(req.user.id, body.channel); }
  @Post('otp/verify') @UseGuards(JwtAuthGuard) verifyOtp(@Req() req: any, @Body() body: VerifyOtpDto) { return this.auth.verifyOtp(req.user.id, body.channel, body.code); }
  @Get('me') @UseGuards(JwtAuthGuard) me(@Req() req: any) { return this.auth.me(req.user.id); }
}
