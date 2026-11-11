import { Body, Controller, Get, ParseEnumPipe, Post, Query, UseGuards } from '@nestjs/common';
import { MaritalStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PartnerPreferenceDto, UpsertProfileDto } from './profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}
  @Get('me') getMine(@CurrentUser() user: { id: string }) { return this.profiles.getMine(user.id); }
  @Post('me') saveMine(@CurrentUser() user: { id: string }, @Body() dto: UpsertProfileDto) { return this.profiles.saveMine(user.id, dto); }
  @Post('me/preferences') savePreferences(@CurrentUser() user: { id: string }, @Body() dto: PartnerPreferenceDto) { return this.profiles.savePreferences(user.id, dto); }
  @Post('me/publish') publish(@CurrentUser() user: { id: string }) { return this.profiles.publish(user.id); }
  @Post('me/hide') hide(@CurrentUser() user: { id: string }) { return this.profiles.unpublish(user.id); }
  @Get('discover') discover(@CurrentUser() user: { id: string }, @Query('city') city?: string, @Query('maritalStatus', new ParseEnumPipe(MaritalStatus, { optional: true })) maritalStatus?: MaritalStatus, @Query('minAge') minAge?: string, @Query('maxAge') maxAge?: string, @Query('take') take?: string) {
    return this.profiles.discover(user.id, { city, maritalStatus, minAge: minAge ? Number(minAge) : undefined, maxAge: maxAge ? Number(maxAge) : undefined, take: take ? Number(take) : undefined });
  }
}
