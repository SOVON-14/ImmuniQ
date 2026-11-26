import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalLink } from './entities/portal-link.entity';
import { Beneficiary } from '../beneficiaries/entities/beneficiary.entity';
import { LegalRepresentative } from '../beneficiaries/entities/legal-representative.entity';
import { RepresentationLink } from '../beneficiaries/entities/representation-link.entity';
import { VaccinationAct } from '../vaccination-acts/entities/vaccination-act.entity';
import { VaccinationAttestation } from '../record/entities/vaccination-attestation.entity';
import { NotificationPreference } from '../notifications/entities/notification-preference.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RecordModule } from '../record/record.module';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortalLink, Beneficiary, LegalRepresentative, RepresentationLink,
      VaccinationAct, VaccinationAttestation, NotificationPreference, Notification,
    ]),
    RecordModule,
  ],
  controllers: [PortalController],
  providers: [PortalService, AuditService],
})
export class PortalModule {}
