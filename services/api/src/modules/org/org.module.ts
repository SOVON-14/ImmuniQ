import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Territory } from './entities/territory.entity';
import { Structure } from './entities/structure.entity';
import { MobileTeam } from './entities/mobile-team.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { Assignment } from '../identity/entities/assignment.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Territory, Structure, MobileTeam, Assignment, AuditLog])],
  controllers: [OrgController],
  providers: [OrgService, AuditService, ScopeService],
  exports: [OrgService],
})
export class OrgModule {}
