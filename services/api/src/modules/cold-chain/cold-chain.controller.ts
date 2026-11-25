import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ColdChainService } from './cold-chain.service';
import {
  CreateEquipmentDto, UpdateEquipmentDto, RecordReadingsDto,
  CreateIncidentDto, DecideIncidentDto,
} from './dto/cold-chain.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';
import { IncidentStatus } from './entities/cold-chain-incident.entity';

@Controller('cold-chain')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ColdChainController {
  constructor(private svc: ColdChainService) {}

  // ---- Équipements ----
  @Get('equipment')
  @RequirePermissions('coldchain.read')
  listEquipment(@CurrentUser() actor: User, @Query('structureId') structureId?: string) {
    return this.svc.listEquipment(actor, structureId);
  }

  @Get('equipment/:id')
  @RequirePermissions('coldchain.read')
  getEquipment(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getEquipment(actor, id);
  }

  @Post('equipment')
  @RequirePermissions('coldchain.manage', 'incident.manage')
  createEquipment(@CurrentUser() actor: User, @Body() dto: CreateEquipmentDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createEquipment(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch('equipment/:id')
  @RequirePermissions('coldchain.manage', 'incident.manage')
  updateEquipment(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEquipmentDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.updateEquipment(actor, id, dto, ip, req.headers['user-agent']);
  }

  // ---- Relevés ----
  @Post('equipment/:id/readings')
  @RequirePermissions('temperature.record')
  recordReadings(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordReadingsDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.recordReadings(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Get('equipment/:id/readings')
  @RequirePermissions('coldchain.read')
  listReadings(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.listReadings(actor, id, from, to);
  }

  // ---- Incidents ----
  @Get('incidents')
  @RequirePermissions('coldchain.read', 'incident.manage')
  listIncidents(@CurrentUser() actor: User, @Query('status') status?: IncidentStatus, @Query('structureId') structureId?: string) {
    return this.svc.listIncidents(actor, status, structureId);
  }

  @Get('incidents/:id')
  @RequirePermissions('coldchain.read', 'incident.manage')
  getIncident(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getIncident(actor, id);
  }

  @Post('incidents')
  @RequirePermissions('incident.manage')
  createIncident(@CurrentUser() actor: User, @Body() dto: CreateIncidentDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createIncident(actor, dto, ip, req.headers['user-agent']);
  }

  @Post('incidents/:id/status')
  @RequirePermissions('incident.manage')
  setStatus(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: { status: IncidentStatus }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.setStatus(actor, id, body.status, ip, req.headers['user-agent']);
  }

  @Post('incidents/:id/decide')
  @RequirePermissions('incident.evaluate')
  decide(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideIncidentDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.decide(actor, id, dto, ip, req.headers['user-agent']);
  }
}
