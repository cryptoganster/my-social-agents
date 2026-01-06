import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { IngestContentCommandHandler } from './app/commands/ingest-content/handler';
import { ContentCollectedEventHandler } from './app/events/content-collected/handler';
import { ContentValidationService } from './domain/services/content-validation';
import { ContentNormalizationService } from './domain/services/content-normalization';
import { DuplicateDetectionService } from './domain/services/duplicate-detection';
import { ContentHashGenerator } from './domain/services/content-hash-generator';

/**
 * IngestionContentModule
 *
 * NestJS module for the Content Ingestion bounded context.
 * Configures CQRS command handlers, event handlers, and domain services with proper dependency injection.
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
 * Dependencies (to be provided by parent module or configured separately):
 * - SourceConfigurationFactory (from source bounded context)
 * - ContentItemReadRepository (infrastructure - read side)
 * - ContentItemWriteRepository (infrastructure - write side)
 * - SourceAdapter[] (infrastructure adapters)
 */
@Module({
  imports: [CqrsModule],
  providers: [
    // Command Handlers
    IngestContentCommandHandler,

    // Event Handlers
    ContentCollectedEventHandler,

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

    // Note: The following dependencies need to be provided by the parent module:
    // - SourceConfigurationFactory (token: 'SourceConfigurationFactory')
    // - ContentItemReadRepository (token: 'ContentItemReadRepository')
    // - ContentItemWriteRepository (token: 'ContentItemWriteRepository')
    // - SourceAdapter[] (token: 'SourceAdapter')
  ],
  exports: [
    // Export command handler for use in other modules
    IngestContentCommandHandler,

    // Export event handlers for use in other modules
    ContentCollectedEventHandler,

    // Export domain services for use in other bounded contexts
    'IContentValidationService',
    'IContentNormalizationService',
    'IDuplicateDetectionService',
  ],
})
export class IngestionContentModule {}
