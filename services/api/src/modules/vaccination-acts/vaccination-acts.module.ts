import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaccinationAct } from './entities/vaccination-act.entity';
import { ActCorrection } from './entities/act-correction.entity';
import { AdverseEvent } from './entities/adverse-event.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { Vaccine } from '../referentials/entities/vaccine.entity';
import { Referential } from '../referentials/entities/referential.entity';
import { VaccinationRule } from '../referentials/entities/vaccination-rule.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { VaccinationActsService } from './vaccination-acts.service';
import { VaccinationActsController } from './vaccination-acts.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VaccinationAct, ActCorrection, AdverseEvent, Beneficiary, Vaccine, Referential, VaccinationRule,
      User, AuditLog, Assignment,
    ]),
  ],
  controllers: [VaccinationActsController],
  providers: [VaccinationActsService, AuditService, ScopeService],
  exports: [VaccinationActsService],
})
export class VaccinationActsModule {}
