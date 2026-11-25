import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * DataSource dédié aux migrations TypeORM (CLI).
 * La connexion applicative reste dans app.module.ts — ici on duplique
 * la config pour que `migration:generate`/`run` fonctionnent hors Nest.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'immuniq',
  password: process.env.DB_PASSWORD ?? 'immuniq',
  database: process.env.DB_NAME ?? 'immuniq',
  entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
});
