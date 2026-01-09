import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionApiModule } from './api/ingestion-api.module';
import { IngestionContentModule } from './content/ingestion-content.module';
import { IngestionJobModule } from './job/ingestion-job.module';
import { IngestionSharedModule } from './shared/ingestion-shared.module';
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
 * - IngestionSharedModule: Shared infrastructure services (retry, circuit breaker, encryption, hashing)
 * - IngestionSourceModule: Source configuration and adapters
 * - IngestionJobModule: Job scheduling and execution
 * - IngestionContentModule: Content collection and processing
 * - IngestionApiModule: CLI and REST API (entry points)
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
 *
 * Requirements: All Content Ingestion requirements (1.x, 2.x, 3.x, 4.x, 5.x)
 */
@Module({
  imports: [
    // Register all TypeORM entities for the Ingestion bounded context
    TypeOrmModule.forFeature([
      ContentItemEntity,
      IngestionJobEntity,
      SourceConfigurationEntity,
    ]),

    // Import sub-modules in dependency order
    IngestionSharedModule, // Shared infrastructure (no dependencies)
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
    IngestionSharedModule,
    IngestionSourceModule,
    IngestionJobModule,
    IngestionContentModule,
    IngestionApiModule,
  ],
})
export class IngestionModule {}
