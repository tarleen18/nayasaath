import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() { return { status: 'ok', service: 'nayasaath-api', version: '0.1.0' }; }

  @Get('launch-status')
  getLaunchStatus() {
    return { publicSiteOnly: process.env.PUBLIC_SITE_ONLY === 'true' };
  }
}
