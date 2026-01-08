import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngestionSharedModule } from '@/ingestion/shared/ingestion-shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';
import { IngestContentCommandHandler } from './app/commands/ingest-content/handler';
import { ContentCollectedEventHandler } from './app/events/content-collected/handler';
import { ContentIngestedEventHandler } from './app/events/content-ingested/handler';
import { ContentValidationFailedEventHandler } from './app/events/content-validation-failed/handler';
import { GetContentByHashQueryHandler } from './app/queries/get-content-by-hash/handler';
import { ContentValidationService } from './domain/services/content-validation';
import { ContentNormalizationService } from './domain/services/content-normalization';
import { DuplicateDetectionService } from './domain/services/duplicate-detection';
import { ContentHashGenerator } from './domain/services/content-hash-generator';
import { ContentItemEntity } from './infra/persistence/entities/content-item';
import { TypeOrmContentItemReadRepository } from './infra/persistence/repositories/content-item-read';
import { TypeOrmContentItemWriteRepository } from './infra/persistence/repositories/content-item-write';
import { TypeOrmContentItemFactory } from './infra/persistence/factories/content-item-factory';

/**
 * IngestionContentModule
 *
 * NestJS module for the Content sub-context within Content Ingestion.
 * Handles content collection, normalization, validation, and persistence.
 *
 * Responsibilities:
 * - Content ingestion (IngestContentCommand)
 * - Content processing (ContentCollectedEvent → ContentIngestedEvent)
 * - Content validation and normalization
 * - Duplicate detection
 * - Content persistence (write repository)
 * - Content queries (read repository)
 * - Content reconstitution (factory)
 *
 * Architecture:
 * - Commands: IngestContentCommand (collection phase)
 * - Events: ContentCollectedEvent → ContentIngestedEvent (processing phase)
 * - Handlers: IngestContentCommandHandler, ContentCollectedEventHandler
 * - Domain Services: ContentValidationService, ContentNormalizationService, DuplicateDetectionService
 *
 * CQRS + Event-Driven Benefits:
 * - Clear separation between write (commands) and read (queries)
 * - Asynchronous processing via events
 * - Better scalability and error isolation
 * - Easier to add new event handlers without modifying existing code
 *
 * Dependencies (from other modules):
 * - ISourceConfigurationFactory (from IngestionSourceModule)
 * - IHashService (from IngestionSharedModule)
 * - SourceAdapter[] (from IngestionSourceModule)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */
@Module({
  imports: [
    CqrsModule,
    IngestionSharedModule,
    IngestionSourceModule, // This exports the adapters
    TypeOrmModule.forFeature([ContentItemEntity]),
  ],
  providers: [
    // Command Handlers
    IngestContentCommandHandler,

    // Event Handlers
    ContentCollectedEventHandler,
    ContentIngestedEventHandler,
    ContentValidationFailedEventHandler,

    // Query Handlers
    GetContentByHashQueryHandler,

    // Domain Services with Interface Tokens
    {
      provide: 'IContentValidationService',
      useClass: ContentValidationService,
    },
    {
      provide: 'IContentNormalizationService',
      useClass: ContentNormalizationService,
    },
    {
      provide: 'IDuplicateDetectionService',
      useClass: DuplicateDetectionService,
    },

    // Supporting Services
    ContentHashGenerator,

    // Content Item Infrastructure - Register both class and interface token
    TypeOrmContentItemReadRepository,
    {
      provide: 'IContentItemReadRepository',
      useExisting: TypeOrmContentItemReadRepository,
    },
    {
      provide: 'IContentItemWriteRepository',
      useClass: TypeOrmContentItemWriteRepository,
    },
    {
      provide: 'IContentItemFactory',
      useClass: TypeOrmContentItemFactory,
    },
  ],
  exports: [
    // Export command handler for use in other modules
    IngestContentCommandHandler,

    // Export event handlers for use in other modules
    ContentCollectedEventHandler,
    ContentIngestedEventHandler,
    ContentValidationFailedEventHandler,

    // Export query handlers for use in other modules
    GetContentByHashQueryHandler,

    // Export domain services for use in other bounded contexts
    'IContentValidationService',
    'IContentNormalizationService',
    'IDuplicateDetectionService',

    // Export content item infrastructure
    'IContentItemReadRepository',
    'IContentItemWriteRepository',
    'IContentItemFactory',
  ],
})
export class IngestionContentModule {}
