import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { Nomenclature } from './entities/nomenclature.entity';
import { RetentionPolicy } from './entities/retention-policy.entity';
import { BackupRecord } from './entities/backup-record.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Setting, Nomenclature, RetentionPolicy, BackupRecord, AuditLog])],
  controllers: [AdminController],
  providers: [AdminService, AuditService],
  exports: [AdminService],
})
export class AdminModule {}
