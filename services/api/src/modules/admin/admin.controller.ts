import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import {
  UpsertSettingDto, CreateNomenclatureDto, UpdateNomenclatureDto,
  UpsertRetentionDto, TriggerBackupDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private svc: AdminService) {}

  // ---- Paramètres ----
  @Get('settings')
  @RequirePermissions('settings.manage', 'settings.read')
  listSettings(@Query('category') category?: string) {
    return this.svc.listSettings(category);
  }

  @Get('settings/:key')
  @RequirePermissions('settings.manage', 'settings.read')
  getSetting(@Param('key') key: string) {
    return this.svc.getSetting(key);
  }

  @Patch('settings/:key')
  @RequirePermissions('settings.manage')
  upsertSetting(@CurrentUser() actor: User, @Param('key') key: string, @Body() dto: UpsertSettingDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.upsertSetting(actor, key, dto, ip, req.headers['user-agent']);
  }

  // ---- Nomenclatures ----
  @Get('nomenclatures')
  @RequirePermissions('nomenclature.manage', 'nomenclature.read')
  listNomenclatures(@Query('domain') domain?: string) {
    return this.svc.listNomenclatures(domain);
  }

  @Post('nomenclatures')
  @RequirePermissions('nomenclature.manage')
  createNomenclature(@CurrentUser() actor: User, @Body() dto: CreateNomenclatureDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createNomenclature(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch('nomenclatures/:id')
  @RequirePermissions('nomenclature.manage')
  updateNomenclature(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNomenclatureDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.updateNomenclature(actor, id, dto, ip, req.headers['user-agent']);
  }

  // ---- Rétention ----
  @Get('retention')
  @RequirePermissions('retention.manage', 'retention.read')
  listRetentions() {
    return this.svc.listRetentions();
  }

  @Patch('retention/:dataType')
  @RequirePermissions('retention.manage')
  upsertRetention(@CurrentUser() actor: User, @Param('dataType') dataType: string, @Body() dto: UpsertRetentionDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.upsertRetention(actor, dataType, dto, ip, req.headers['user-agent']);
  }

  // ---- Sauvegardes ----
  @Get('backups')
  @RequirePermissions('backup.manage', 'backup.read')
  listBackups() {
    return this.svc.listBackups();
  }

  @Post('backups')
  @RequirePermissions('backup.manage')
  triggerBackup(@CurrentUser() actor: User, @Body() dto: TriggerBackupDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.triggerBackup(actor, dto, ip, req.headers['user-agent']);
  }

  // ---- Audit ----
  @Get('audit-log')
  @RequirePermissions('audit.read')
  auditLog(@Query() filters: { action?: string; resourceType?: string; actorId?: string; from?: string; to?: string }) {
    return this.svc.listAudit(filters);
  }
}
