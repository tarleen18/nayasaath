import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicLaunchGuard } from '../public-launch.guard';
import { PartnerPreferenceDto, UpsertProfileDto } from './profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles/me')
@UseGuards(JwtAuthGuard)
export class PrivateProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  getMine(@CurrentUser() user: { id: string }) {
    return this.profiles.getMine(user.id);
  }

  @Post()
  @UseGuards(PublicLaunchGuard)
  saveMine(@CurrentUser() user: { id: string }, @Body() dto: UpsertProfileDto) {
    return this.profiles.saveMine(user.id, dto);
  }

  @Post('preferences')
  @UseGuards(PublicLaunchGuard)
  savePreferences(@CurrentUser() user: { id: string }, @Body() dto: PartnerPreferenceDto) {
    return this.profiles.savePreferences(user.id, dto);
  }
}
