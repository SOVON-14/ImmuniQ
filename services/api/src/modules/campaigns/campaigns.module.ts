import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignSession } from './entities/campaign-session.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    Campaign, CampaignSession, VaccinationAct, User, AuditLog, Assignment,
  ])],
  controllers: [CampaignsController],
  providers: [CampaignsService, AuditService, ScopeService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
