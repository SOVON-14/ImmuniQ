import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto, UpdateCampaignDto, CreateSessionDto, UpdateSessionDto, TransitionCampaignDto,
} from './dto/campaigns.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';
import { CampaignStatus } from './entities/campaign.entity';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CampaignsController {
  constructor(private svc: CampaignsService) {}

  @Get()
  @RequirePermissions('campaign.read')
  list(@CurrentUser() actor: User, @Query('status') status?: CampaignStatus) {
    return this.svc.list(actor, status);
  }

  @Get(':id')
  @RequirePermissions('campaign.read')
  get(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(actor, id);
  }

  @Post()
  @RequirePermissions('campaign.create')
  create(@CurrentUser() actor: User, @Body() dto: CreateCampaignDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.create(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch(':id')
  @RequirePermissions('campaign.create', 'campaign.plan')
  update(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.update(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/transition')
  @RequirePermissions('campaign.plan', 'campaign.create')
  transition(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionCampaignDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.transition(actor, id, dto, ip, req.headers['user-agent']);
  }

  // ---- Séances ----
  @Get(':id/sessions')
  @RequirePermissions('campaign.read')
  sessions(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.listSessions(actor, id);
  }

  @Post(':id/sessions')
  @RequirePermissions('campaign.plan', 'campaign.create')
  addSession(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSessionDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.addSession(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Patch('sessions/:sessionId')
  @RequirePermissions('campaign.plan', 'campaign.create')
  updateSession(@CurrentUser() actor: User, @Param('sessionId', ParseUUIDPipe) sessionId: string, @Body() dto: UpdateSessionDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.updateSession(actor, sessionId, dto, ip, req.headers['user-agent']);
  }

  @Get(':id/stats')
  @RequirePermissions('campaign.read', 'report.read')
  stats(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.stats(actor, id);
  }
}
