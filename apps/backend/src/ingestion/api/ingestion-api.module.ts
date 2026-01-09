import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IngestionJobModule } from '../job/ingestion-job.module';
import { IngestionSourceModule } from '../source/ingestion-source.module';
import { IngestionJobsController } from './http/controllers/ingestion-jobs.controller';
import { SourcesController } from './http/controllers/sources.controller';

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
 * - Uses interface tokens for read repositories (injected from sub-modules)
 * - Controllers inject abstractions, not infrastructure details
 *
 * Dependencies (provided by imported modules):
 * - IIngestionJobReadRepository (from IngestionJobModule)
 * - ISourceConfigurationReadRepository (from IngestionSourceModule)
 *
 * Requirements: All
 */
@Module({
  imports: [
    CqrsModule,
    IngestionJobModule, // Provides IIngestionJobReadRepository
    IngestionSourceModule, // Provides ISourceConfigurationReadRepository
  ],
  controllers: [IngestionJobsController, SourcesController],
  providers: [
    // Note: Read repositories are provided by imported modules
  ],
})
export class IngestionApiModule {}
