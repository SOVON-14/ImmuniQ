import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { User } from '../identity/entities/user.entity';
import { AuditLog } from '../identity/entities/audit-log.entity';
import { Assignment } from '../identity/entities/assignment.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AuditService } from '../../common/audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import { RecordModule } from '../record/record.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplate, NotificationPreference, Notification,
      Beneficiary, User, AuditLog, Assignment,
    ]),
    RecordModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, AuditService, ScopeService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
