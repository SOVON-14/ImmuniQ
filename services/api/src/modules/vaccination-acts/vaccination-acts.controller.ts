import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { VaccinationActsService } from './vaccination-acts.service';
import {
  CreateActDto, UpdateActDto, TransitionActDto, DeclareAdverseEventDto, ListActsQuery,
} from './dto/vaccination-acts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('vaccination-acts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VaccinationActsController {
  constructor(private svc: VaccinationActsService) {}

  @Get()
  @RequirePermissions('act.read')
  list(@CurrentUser() actor: User, @Query() q: ListActsQuery) {
    return this.svc.list(actor, q);
  }

  @Get(':id')
  @RequirePermissions('act.read')
  get(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(actor, id);
  }

  @Get(':id/corrections')
  @RequirePermissions('act.read')
  history(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.history(actor, id);
  }

  @Post()
  @RequirePermissions('act.create')
  create(@CurrentUser() actor: User, @Body() dto: CreateActDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.create(actor, dto, ip, req.headers['user-agent']);
  }

  @Patch(':id')
  @RequirePermissions('act.update', 'act.create')
  update(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActDto & { reason?: string },
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.svc.update(actor, id, dto, dto.reason, ip, req.headers['user-agent']);
  }

  @Post(':id/transition')
  @RequirePermissions('act.create')
  transition(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionActDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.transition(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/validate')
  @RequirePermissions('act.validate')
  validate(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Req() req: Request) {
    return this.svc.validate(actor, id, ip, req.headers['user-agent']);
  }

  // ---- Effets indésirables ----

  @Get('adverse-events/list')
  @RequirePermissions('adverse_event.declare', 'act.read')
  listAdverse(@CurrentUser() actor: User) {
    return this.svc.listAdverseEvents(actor);
  }

  @Post('adverse-events')
  @RequirePermissions('adverse_event.declare')
  declareAdverse(@CurrentUser() actor: User, @Body() dto: DeclareAdverseEventDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.declareAdverseEvent(actor, dto, ip, req.headers['user-agent']);
  }
}
