import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';
import { IngestionApiModule } from './api/ingestion-api.module';
import { IngestionContentModule } from './content/ingestion-content.module';
import { IngestionJobModule } from './job/ingestion-job.module';
import { IngestionSourceModule } from './source/ingestion-source.module';

// TypeORM Entities
import { ContentItemEntity } from './content/infra/persistence/entities/content-item';
import { IngestionJobEntity } from './job/infra/persistence/entities/ingestion-job';
import { SourceConfigurationEntity } from './source/infra/persistence/entities/source-configuration';

/**
 * IngestionModule
 *
 * Root module for the Content Ingestion bounded context.
 * Orchestrates all sub-modules and provides infrastructure implementations.
 *
 * Sub-Modules:
 * - IngestionSourceModule: Source configuration and adapters
 * - IngestionJobModule: Job scheduling and execution
 * - IngestionContentModule: Content collection and processing
 * - IngestionApiModule: CLI and REST API (entry points)
 *
 * Shared Infrastructure (from SharedModule):
 * - IRetryService, ICircuitBreaker (resilience)
 * - IHashService, ICredentialEncryption (cryptographic)
 * - ScheduleModule (job scheduling)
 * - Event publishing via @nestjs/cqrs EventBus
 *
 * Architecture:
 * - Follows Clean Architecture with strict layer separation
 * - Implements DDD bounded context principles
 * - Uses CQRS for command/query separation
 * - Event-driven communication between sub-contexts
 *
 * Infrastructure:
 * - TypeORM for persistence (PostgreSQL)
 * - NestJS CQRS for command/query handling
 * - Pluggable source adapters (web scraping, RSS, social media, PDF, OCR, Wikipedia)
 * - Resilience patterns (retry, circuit breaker)
 */
@Module({
  imports: [
    // Register all TypeORM entities for the Ingestion bounded context
    TypeOrmModule.forFeature([
      ContentItemEntity,
      IngestionJobEntity,
      SourceConfigurationEntity,
    ]),

    // Shared infrastructure (resilience, scheduling, cryptographic services)
    SharedModule,

    // Import sub-modules in dependency order
    IngestionSourceModule, // Depends on: Shared
    IngestionJobModule, // Depends on: Shared, Source
    IngestionContentModule, // Depends on: Shared, Source (registers its own repositories)
    IngestionApiModule, // Depends on: Content, Job, Source
  ],
  providers: [
    // Note: Content item infrastructure is now registered in IngestionContentModule
  ],
  exports: [
    // Export sub-modules for use in AppModule or other bounded contexts
    SharedModule,
    IngestionSourceModule,
    IngestionJobModule,
    IngestionContentModule,
    IngestionApiModule,
  ],
})
export class IngestionModule {}
