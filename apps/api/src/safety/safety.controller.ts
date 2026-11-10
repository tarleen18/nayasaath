import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BlockMemberDto, ReportMemberDto } from './safety.dto';
import { SafetyService } from './safety.service';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}
  @Post('blocks') block(@CurrentUser() user: { id: string }, @Body() dto: BlockMemberDto) { return this.safety.block(user.id, dto.targetUserId); }
  @Delete('blocks/:targetUserId') unblock(@CurrentUser() user: { id: string }, @Param('targetUserId') targetUserId: string) { return this.safety.unblock(user.id, targetUserId); }
  @Get('blocks') listBlocks(@CurrentUser() user: { id: string }) { return this.safety.listBlocks(user.id); }
  @Post('reports') report(@CurrentUser() user: { id: string }, @Body() dto: ReportMemberDto) { return this.safety.report(user.id, dto.targetUserId, dto.category, dto.description); }
}
