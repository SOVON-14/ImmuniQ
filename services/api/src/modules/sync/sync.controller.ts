import {
  Body, Controller, Get, Ip, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SyncService } from './sync.service';
import { PushDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  constructor(private svc: SyncService) {}

  /**
   * POST /api/v1/sync/push — envoi des opérations hors ligne.
   * Réponse par opération : applied | duplicate | rejected + entityId.
   */
  @Post('push')
  @RequirePermissions('sync.push')
  push(@CurrentUser() actor: User, @Body() dto: PushDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.push(actor, dto, ip, req.headers['user-agent']);
  }

  /**
   * GET /api/v1/sync/pull?since=ISO — delta des données pour le client hors ligne.
   */
  @Get('pull')
  @RequirePermissions('sync.pull')
  pull(@CurrentUser() actor: User, @Query('since') since?: string) {
    return this.svc.pull(actor, since);
  }
}
