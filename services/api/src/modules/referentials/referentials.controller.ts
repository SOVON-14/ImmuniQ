import {
  Body, Controller, Delete, Get, Ip, Param, ParseUUIDPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReferentialsService } from './referentials.service';
import { CreateVaccineDto, CreatePresentationDto, CreateReferentialDto, CreateRuleDto } from './dto/referentials.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';
import { VaccineStatus } from './entities/vaccine.entity';
import { ReferentialStatus } from './entities/referential.entity';
import { ReferentialType } from './entities/referential.entity';

@Controller('referentials')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReferentialsController {
  constructor(private svc: ReferentialsService) {}

  // ---- Vaccins ----
  @Get('vaccines')
  @RequirePermissions('referential.read')
  vaccines(@Query('status') status?: VaccineStatus) {
    return this.svc.listVaccines(status);
  }

  @Post('vaccines')
  @RequirePermissions('referential.draft')
  createVaccine(@CurrentUser() actor: User, @Body() dto: CreateVaccineDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createVaccine(actor, dto, ip, req.headers['user-agent']);
  }

  @Post('vaccines/:id/presentations')
  @RequirePermissions('referential.draft')
  addPresentation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePresentationDto) {
    return this.svc.addPresentation(id, dto);
  }

  // ---- Référentiels ----
  @Get()
  @RequirePermissions('referential.read')
  list(@Query('status') status?: ReferentialStatus, @Query('type') type?: ReferentialType) {
    return this.svc.listReferentials(status, type);
  }

  @Get('published/:type')
  @RequirePermissions('referential.read')
  published(@Param('type') type: ReferentialType) {
    return this.svc.getPublished(type);
  }

  @Get(':id')
  @RequirePermissions('referential.read')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getReferential(id);
  }

  @Post()
  @RequirePermissions('referential.draft')
  create(@CurrentUser() actor: User, @Body() dto: CreateReferentialDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createVersion(actor, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/rules')
  @RequirePermissions('referential.draft')
  addRule(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateRuleDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.addRule(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Delete(':id/rules/:ruleId')
  @RequirePermissions('referential.draft')
  removeRule(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Param('ruleId', ParseUUIDPipe) ruleId: string) {
    return this.svc.removeRule(actor, id, ruleId);
  }

  @Post(':id/submit')
  @RequirePermissions('referential.submit')
  submit(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Req() req: Request) {
    return this.svc.submit(actor, id, ip, req.headers['user-agent']);
  }

  @Post(':id/approve')
  @RequirePermissions('referential.approve')
  approve(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: { comment?: string }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.approve(actor, id, body?.comment, ip, req.headers['user-agent']);
  }

  @Post(':id/publish')
  @RequirePermissions('referential.publish')
  publish(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Req() req: Request) {
    return this.svc.publish(actor, id, ip, req.headers['user-agent']);
  }

  @Post(':id/withdraw')
  @RequirePermissions('referential.publish')
  withdraw(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: { comment?: string }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.withdraw(actor, id, body?.comment, ip, req.headers['user-agent']);
  }
}
