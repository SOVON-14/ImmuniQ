import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { IdentityModule } from './modules/identity/identity.module';
import { OrgModule } from './modules/org/org.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { ReferentialsModule } from './modules/referentials/referentials.module';
import { VaccinationActsModule } from './modules/vaccination-acts/vaccination-acts.module';
import { RecordModule } from './modules/record/record.module';
import { SyncModule } from './modules/sync/sync.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ColdChainModule } from './modules/cold-chain/cold-chain.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { AdminModule } from './modules/admin/admin.module';
import { PortalModule } from './modules/portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global : 300 req/min par IP par défaut ; /auth/login et /auth/refresh
    // ont une limite renforcée via @Throttle (5 req/min).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'immuniq',
      password: process.env.DB_PASSWORD ?? 'immuniq',
      database: process.env.DB_NAME ?? 'immuniq',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      // Migrations : générées via `pnpm migration:generate` quand une BDD de dev est dispo.
      // En production : synchronize=false + migrationsRun piloté au déploiement.
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsTableName: 'typeorm_migrations',
      logging: process.env.DB_LOGGING === 'true',
    }),
    IdentityModule,
    OrgModule,
    BeneficiariesModule,
    ReferentialsModule,
    VaccinationActsModule,
    RecordModule,
    SyncModule,
    LogisticsModule,
    ColdChainModule,
    CampaignsModule,
    NotificationsModule,
    ReportingModule,
    AdminModule,
    PortalModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
