import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * TypeORM DataSource Configuration
 *
 * This configuration is used for:
 * - Running migrations (npm run migration:run)
 * - Generating migrations (npm run migration:generate)
 * - Reverting migrations (npm run migration:revert)
 *
 * Environment Variables:
 * - DB_HOST: Database host (default: localhost)
 * - DB_PORT: Database port (default: 5432)
 * - DB_USERNAME: Database username (default: postgres)
 * - DB_PASSWORD: Database password (default: postgres)
 * - DB_DATABASE: Database name (default: crypto_knowledge)
 *
 * For NestJS application runtime, use TypeOrmModule.forRoot() in app.module.ts
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'crypto_knowledge',
  entities: [
    // TypeORM entities for all bounded contexts
    'src/**/infra/persistence/entities/*.ts',
  ],
  migrations: [
    // Migration files organized by bounded context
    'src/ingestion/migrations/*.ts',
    // Future bounded contexts will add their migrations here:
    // 'src/processing/migrations/*.ts',
    // 'src/retrieval/migrations/*.ts',
  ],
  synchronize: false, // Never use synchronize in production
  logging: process.env.NODE_ENV === 'development',
});
