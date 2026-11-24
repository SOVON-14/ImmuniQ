import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vaccine } from './entities/vaccine.entity';
import { VaccinePresentation } from './entities/vaccine-presentation.entity';
import { Referential } from './entities/referential.entity';
import { VaccinationRule } from './entities/vaccination-rule.entity';
import { RuleValidation } from './entities/rule-validation.entity';
import { ReferentialsService } from './referentials.service';
import { ReferentialsController } from './referentials.controller';
import { AuditService } from '../../common/audit/audit.service';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vaccine, VaccinePresentation, Referential, VaccinationRule, RuleValidation, User, AuditLog])],
  controllers: [ReferentialsController],
  providers: [ReferentialsService, AuditService],
  exports: [ReferentialsService],
})
export class ReferentialsModule {}
