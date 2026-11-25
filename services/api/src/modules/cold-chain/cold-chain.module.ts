import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColdChainEquipment } from './entities/cold-chain-equipment.entity';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { ColdChainIncident } from './entities/cold-chain-incident.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { ColdChainService } from './cold-chain.service';
import { ColdChainController } from './cold-chain.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    ColdChainEquipment, TemperatureReading, ColdChainIncident,
    User, AuditLog, Assignment,
  ])],
  controllers: [ColdChainController],
  providers: [ColdChainService, AuditService, ScopeService],
  exports: [ColdChainService],
})
export class ColdChainModule {}
