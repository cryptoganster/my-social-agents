import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IngestionJobsController } from './http/controllers/ingestion-jobs.controller';
import { SourcesController } from './http/controllers/sources.controller';
import { TypeOrmIngestionJobReadRepository } from '@/ingestion/job/infra/persistence/repositories/ingestion-job-read';
import { TypeOrmSourceConfigurationReadRepository } from '@/ingestion/source/infra/persistence/repositories/source-configuration-read';

/**
 * IngestionApiModule
 *
 * Module for ingestion API layer (HTTP controllers and CLI).
 * Provides REST endpoints for:
 * - Scheduling and querying ingestion jobs
 * - Configuring and querying content sources
 *
 * Follows Clean Architecture:
 * - API layer depends only on Application layer (CommandBus)
 * - Uses interface tokens for read repositories (not concrete implementations)
 * - Controllers inject abstractions, not infrastructure details
 *
 * Requirements: All
 */
@Module({
  imports: [CqrsModule],
  controllers: [IngestionJobsController, SourcesController],
  providers: [
    // Read repositories with interface tokens
    // API layer depends on abstractions, not concrete implementations
    {
      provide: 'IIngestionJobReadRepository',
      useClass: TypeOrmIngestionJobReadRepository,
    },
    {
      provide: 'ISourceConfigurationReadRepository',
      useClass: TypeOrmSourceConfigurationReadRepository,
    },
  ],
})
export class IngestionApiModule {}
