import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConnectionsService } from './connections.service';
import { RespondInterestDto, SendInterestDto, SendMessageDto } from './connections.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}
  @Post('interests') sendInterest(@CurrentUser() user: { id: string }, @Body() dto: SendInterestDto) { return this.connections.sendInterest(user.id, dto.receiverId); }
  @Get('interests') listInterests(@CurrentUser() user: { id: string }, @Query('direction') direction?: 'incoming' | 'outgoing') { return this.connections.listInterests(user.id, direction === 'outgoing' ? 'outgoing' : 'incoming'); }
  @Patch('interests/:id') respond(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: RespondInterestDto) { return this.connections.respond(user.id, id, dto.status); }
  @Get('conversations') conversations(@CurrentUser() user: { id: string }) { return this.connections.conversations(user.id); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.connections.messages(user.id, id); }
  @Post('conversations/:id/messages') sendMessage(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.connections.sendMessage(user.id, id, dto.body); }
}
