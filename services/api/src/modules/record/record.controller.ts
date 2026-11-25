import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Post, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RecordService } from './record.service';
import { RevokeAttestationDto } from './dto/record.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

@Controller('records')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecordController {
  constructor(private svc: RecordService) {}

  @Get(':beneficiaryId')
  @RequirePermissions('record.read')
  get(@CurrentUser() actor: User, @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string) {
    return this.svc.getRecord(actor, beneficiaryId);
  }

  @Get(':beneficiaryId/schedule')
  @RequirePermissions('record.read')
  schedule(@CurrentUser() actor: User, @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string) {
    return this.svc.getSchedule(actor, beneficiaryId);
  }

  @Get(':beneficiaryId/attestations')
  @RequirePermissions('record.read')
  attestations(@CurrentUser() actor: User, @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string) {
    return this.svc.listAttestations(actor, beneficiaryId);
  }

  @Post(':beneficiaryId/attestations')
  @RequirePermissions('record.issue')
  issue(@CurrentUser() actor: User, @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string, @Ip() ip: string, @Req() req: Request) {
    return this.svc.issueAttestation(actor, beneficiaryId, ip, req.headers['user-agent']);
  }

  @Post('attestations/:id/revoke')
  @RequirePermissions('record.issue')
  revoke(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RevokeAttestationDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.revokeAttestation(actor, id, dto.reason, ip, req.headers['user-agent']);
  }
}
