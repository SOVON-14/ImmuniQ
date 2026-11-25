import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportExport } from './entities/report-export.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { StockLevel } from '../logistics/entities/stock-level.entity';
import { ColdChainIncident } from '../cold-chain/entities/cold-chain-incident.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    ReportExport, VaccinationAct, Beneficiary, StockLevel,
    ColdChainIncident, Campaign, User, AuditLog, Assignment,
  ])],
  controllers: [ReportingController],
  providers: [ReportingService, AuditService, ScopeService],
  exports: [ReportingService],
})
export class ReportingModule {}
