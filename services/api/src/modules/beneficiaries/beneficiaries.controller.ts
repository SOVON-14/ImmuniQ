import {
  Body, Controller, Delete, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto, CreateRepresentativeDto, LinkRepresentativeDto } from './dto/beneficiaries.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BeneficiariesController {
  constructor(private svc: BeneficiariesService) {}

  @Get()
  @RequirePermissions('beneficiary.read')
  search(@CurrentUser() actor: User, @Query('q') q?: string, @Query('structureId') structureId?: string) {
    return this.svc.search(actor, q ?? '', structureId);
  }

  @Post()
  @RequirePermissions('beneficiary.create')
  create(@CurrentUser() actor: User, @Body() dto: CreateBeneficiaryDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.create(actor, dto, ip, req.headers['user-agent']);
  }

  @Get(':id')
  @RequirePermissions('beneficiary.read')
  get(@CurrentUser() actor: User, @Param('id') id: string) {
    return this.svc.getById(actor, id);
  }

  @Patch(':id')
  @RequirePermissions('beneficiary.update')
  update(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBeneficiaryDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.update(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/merge')
  @RequirePermissions('merge.approve')
  merge(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: { targetId: string; reason: string }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.merge(actor, id, body.targetId, body.reason, ip, req.headers['user-agent']);
  }

  @Post(':id/representatives')
  @RequirePermissions('representative.manage')
  createRepresentative(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateRepresentativeDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.createRepresentative(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Post(':id/representation-links')
  @RequirePermissions('representative.manage')
  link(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkRepresentativeDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.linkRepresentative(actor, id, dto, ip, req.headers['user-agent']);
  }

  @Delete(':id/representation-links/:linkId')
  @RequirePermissions('representative.manage')
  revoke(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Param('linkId', ParseUUIDPipe) linkId: string, @Body() body: { reason?: string }, @Ip() ip: string, @Req() req: Request) {
    return this.svc.revokeLink(actor, id, linkId, body?.reason, ip, req.headers['user-agent']);
  }
}
