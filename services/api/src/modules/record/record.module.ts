import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaccinationAttestation } from './entities/vaccination-attestation.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { Referential } from '../referentials/entities/referential.entity';
import { VaccinationRule } from '../referentials/entities/vaccination-rule.entity';
import { Vaccine } from '../referentials/entities/vaccine.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { RecordService } from './record.service';
import { RecordController } from './record.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VaccinationAttestation, Beneficiary, VaccinationAct, Referential,
      VaccinationRule, Vaccine, User, AuditLog, Assignment,
    ]),
  ],
  controllers: [RecordController],
  providers: [RecordService, AuditService, ScopeService],
  exports: [RecordService],
})
export class RecordModule {}
