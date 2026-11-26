import {
  Body, Controller, Get, Ip, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PortalService } from './portal.service';
import { LinkBeneficiaryDto, UpdatePreferenceDto } from './dto/portal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../identity/entities/user.entity';

/**
 * Portail bénéficiaire (self-service).
 * Accès strictement limité aux comptes role=beneficiary / legal_representative
 * et aux dossiers explicitement liés au compte.
 */
@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private svc: PortalService) {}

  /** Liste des dossiers accessibles depuis ce compte. */
  @Get('me')
  me(@CurrentUser() actor: User) {
    return this.svc.myBeneficiaries(actor);
  }

  /** Crée la liaison compte ↔ dossier après vérification IMQ-id + naissance. */
  @Post('link')
  link(@CurrentUser() actor: User, @Body() dto: LinkBeneficiaryDto, @Ip() ip: string, @Req() req: Request) {
    return this.svc.linkBeneficiary(actor, dto, ip, req.headers['user-agent']);
  }

  /** Dossier vaccinal d'un bénéficiaire lié (actes, échéancier, attestations). */
  @Get('beneficiaries/:id/record')
  record(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getRecord(actor, id);
  }

  @Get('beneficiaries/:id/preferences')
  preferences(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getPreferences(actor, id);
  }

  @Patch('beneficiaries/:id/preferences')
  updatePreference(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePreferenceDto,
    @Ip() ip: string,
  ) {
    return this.svc.updatePreference(actor, id, dto, ip);
  }

  /** Notifications (rappels) des dossiers liés. */
  @Get('notifications')
  notifications(@CurrentUser() actor: User) {
    return this.svc.myNotifications(actor);
  }
}
