import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from './modules/identity/identity.module';
import { OrgModule } from './modules/org/org.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { ReferentialsModule } from './modules/referentials/referentials.module';
import { VaccinationActsModule } from './modules/vaccination-acts/vaccination-acts.module';
import { RecordModule } from './modules/record/record.module';
import { SyncModule } from './modules/sync/sync.module';
import { LogisticsModule } from './modules/logistics/logistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'immuniq',
      password: process.env.DB_PASSWORD ?? 'immuniq',
      database: process.env.DB_NAME ?? 'immuniq',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
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
  ],
})
export class AppModule {}
