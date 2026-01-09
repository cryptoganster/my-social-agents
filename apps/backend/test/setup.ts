import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

/**
 * Test Database Setup
 *
 * Creates a test database connection for integration tests.
 * Uses a separate test database to avoid affecting development data.
 */
export const createTestDataSource = (): DataSource => {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE_TEST ?? 'crypto_knowledge_test',
    entities: ['src/**/infra/persistence/entities/*.ts'],
    synchronize: true, // Auto-create schema for tests
    dropSchema: true, // Drop schema before each test run
    logging: false,
  });
};

/**
 * Global test setup
 */
export const setupTestDatabase = async (): Promise<DataSource> => {
  const dataSource = createTestDataSource();
  await dataSource.initialize();
  return dataSource;
};

/**
 * Global test teardown
 */
export const teardownTestDatabase = async (
  dataSource: DataSource,
): Promise<void> => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
};
