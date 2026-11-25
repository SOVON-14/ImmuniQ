import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import {
  CreateTemplateDto, UpdatePreferenceDto, SendNotificationDto, ListNotificationsQuery,
} from './dto/notifications.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';
import { NotificationChannel } from './entities/notification-template.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  // ---- Templates ----
  @Get('templates')
  @RequirePermissions('notification.read')
  templates() {
    return this.svc.listTemplates();
  }

  @Post('templates')
  @RequirePermissions('notification.send', 'settings.manage')
  createTemplate(@CurrentUser() actor: User, @Body() dto: CreateTemplateDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createTemplate(actor, dto, ip, req.headers['user-agent']);
  }

  // ---- Préférences ----
  @Get('preferences/:beneficiaryId')
  @RequirePermissions('preference.manage', 'notification.read', 'record.read')
  getPreferences(@CurrentUser() actor: User, @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string) {
    return this.svc.getPreferences(actor, beneficiaryId);
  }

  @Patch('preferences/:beneficiaryId/:channel')
  @RequirePermissions('preference.manage')
  upsertPreference(
    @CurrentUser() actor: User,
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Param('channel') channel: NotificationChannel,
    @Body() dto: UpdatePreferenceDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.svc.upsertPreference(actor, beneficiaryId, channel, dto, ip, req.headers['user-agent']);
  }

  // ---- Envois ----
  @Get()
  @RequirePermissions('notification.read')
  list(@CurrentUser() actor: User, @Query() q: ListNotificationsQuery) {
    return this.svc.list(actor, q);
  }

  @Post('send')
  @RequirePermissions('notification.send')
  send(@CurrentUser() actor: User, @Body() dto: SendNotificationDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.send(actor, dto, ip, req.headers['user-agent']);
  }

  @Post('process')
  @RequirePermissions('notification.send')
  process() {
    return this.svc.processQueue();
  }

  @Post('reminders/generate')
  @RequirePermissions('notification.send')
  generateReminders(@Body() body: { daysAhead?: number }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.generateReminders(body?.daysAhead ?? 7, ip, req.headers['user-agent']);
  }
}
