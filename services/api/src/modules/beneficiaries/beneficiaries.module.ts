import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Beneficiary } from './entities/beneficiary.entity';
import { LegalRepresentative } from './entities/legal-representative.entity';
import { RepresentationLink } from './entities/representation-link.entity';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { Assignment } from '../identity/entities/assignment.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Structure } from '../org/entities/structure.entity';
import { Territory } from '../org/entities/territory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Beneficiary, LegalRepresentative, RepresentationLink, Assignment, AuditLog, Structure, Territory])],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, AuditService, ScopeService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
