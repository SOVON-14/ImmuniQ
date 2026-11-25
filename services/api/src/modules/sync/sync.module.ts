import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncOperation } from './entities/sync-operation.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { Referential } from '../referentials/entities/referential.entity';
import { User } from '../identity/entities/user.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ScopeService } from '../../common/scope/scope.service';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { VaccinationActsModule } from '../vaccination-acts/vaccination-acts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncOperation, Beneficiary, VaccinationAct, Referential, User, Assignment]),
    BeneficiariesModule,
    VaccinationActsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, ScopeService],
  exports: [SyncService],
})
export class SyncModule {}
