import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SharedModule } from '@/shared/shared.module';
import { IngestionSourceModule } from '@/ingestion/source/ingestion-source.module';

// Command Handlers
import { IngestContentCommandHandler } from './app/commands/ingest-content/handler';
import { NormalizeRawContentHandler } from './app/commands/normalize-raw-content/handler';
import { ValidateContentQualityHandler } from './app/commands/validate-content-quality/handler';
import { SaveContentItemHandler } from './app/commands/save-content-item/handler';

// Event Handlers (pipeline)
import { NormalizeRawContentOnContentCollected } from './app/events/normalize-raw-content-on-content-collected';
import { ValidateContentQualityOnContentNormalized } from './app/events/validate-content-quality-on-content-normalized';
import { CheckDuplicateAndPublishOnContentQualityValidated } from './app/events/check-duplicate-and-publish-on-content-quality-validated';
import { SaveContentItemOnContentDeduplicationChecked } from './app/events/save-content-item-on-content-deduplication-checked';

// Event Handlers (metrics)
import { IncrementJobMetricsOnContentIngested } from './app/events/increment-job-metrics-on-content-ingested';
import { RecordValidationErrorInJobMetricsOnContentValidationFailed } from './app/events/record-validation-error-in-job-metrics-on-content-validation-failed';

// Query Handlers
import { GetContentByHashQueryHandler } from './app/queries/get-content-by-hash/handler';
import { CheckContentDuplicateHandler } from './app/queries/check-content-duplicate/handler';

// Domain Services
import { ContentValidationService } from './domain/services/content-validation';
import { ContentNormalizationService } from './domain/services/content-normalization';
import { DuplicateDetectionService } from './domain/services/duplicate-detection';
import { ContentHashGenerator } from './domain/services/content-hash-generator';
import { ContentParser } from './domain/services/content-parser';
import { JsRenderingDetector } from './domain/services/js-rendering-detector';

// Infrastructure - Persistence
import { ContentItemEntity } from './infra/persistence/entities/content-item';
import { TypeOrmContentItemReadRepository } from './infra/persistence/repositories/content-item-read';
import { TypeOrmContentItemWriteRepository } from './infra/persistence/repositories/content-item-write';
import { TypeOrmContentItemFactory } from './infra/persistence/factories/content-item-factory';

// Infrastructure - Parsing Strategies
import { HtmlParsingStrategy } from './infra/parsing/html-parsing-strategy';
import { RssParsingStrategy } from './infra/parsing/rss-parsing-strategy';
import { FirecrawlParsingStrategy } from './infra/parsing/firecrawl-parsing-strategy';

// Infrastructure - Firecrawl
import { FirecrawlClient } from './infra/firecrawl/firecrawl-client';

// Configuration
import {
  loadFirecrawlConfig,
  validateFirecrawlConfig,
} from '@/ingestion/config/firecrawl.config';

/**
 * IngestionContentModule
 *
 * NestJS module for the Content sub-context within Content Ingestion.
 * Handles content collection, normalization, validation, and persistence.
 *
 * Content Processing Pipeline:
 * 1. ContentCollected → NormalizeRawContentOnContentCollected → NormalizeRawContentCommand
 * 2. ContentNormalized → ValidateContentQualityOnContentNormalized → ValidateContentQualityCommand
 * 3. ContentQualityValidated → CheckDuplicateAndPublishOnContentQualityValidated → CheckContentDuplicateQuery → ContentDeduplicationChecked
 * 4. ContentDeduplicationChecked → SaveContentItemOnContentDeduplicationChecked → SaveContentItemCommand
 * 5. ContentIngested → IncrementJobMetricsOnContentIngested (metrics update)
 *
 * Each step is a separate command/query with single responsibility.
 * Event handlers are thin adapters that trigger commands/queries and publish events.
 *
 * Firecrawl Integration:
 * - Firecrawl is conditionally registered based on FIRECRAWL_ENABLED config
 * - When enabled, provides fallback parsing for JavaScript-heavy websites
 * - JsRenderingDetector determines when to use Firecrawl fallback
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 6.1, 6.2
 */
@Module({
  imports: [
    CqrsModule,
    SharedModule,
    IngestionSourceModule,
    TypeOrmModule.forFeature([ContentItemEntity]),
  ],
  providers: [
    // ===== Command Handlers =====
    IngestContentCommandHandler,
    NormalizeRawContentHandler,
    ValidateContentQualityHandler,
    SaveContentItemHandler,

    // ===== Event Handlers (Pipeline) =====
    NormalizeRawContentOnContentCollected,
    ValidateContentQualityOnContentNormalized,
    CheckDuplicateAndPublishOnContentQualityValidated,
    SaveContentItemOnContentDeduplicationChecked,

    // ===== Event Handlers (Metrics) =====
    IncrementJobMetricsOnContentIngested,
    RecordValidationErrorInJobMetricsOnContentValidationFailed,

    // ===== Query Handlers =====
    GetContentByHashQueryHandler,
    CheckContentDuplicateHandler,

    // ===== Domain Services =====
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
    ContentHashGenerator,

    // ===== Parsing Strategies =====
    {
      provide: 'IHtmlParsingStrategy',
      useClass: HtmlParsingStrategy,
    },
    {
      provide: 'IRssParsingStrategy',
      useClass: RssParsingStrategy,
    },

    // ===== Firecrawl Integration (Conditional) =====
    // FirecrawlClient - conditionally registered based on config
    {
      provide: 'IFirecrawlClient',
      useFactory: (configService: ConfigService) => {
        const config = loadFirecrawlConfig(configService);
        if (config.enabled) {
          validateFirecrawlConfig(config);
          return new FirecrawlClient(configService);
        }
        return null; // Disabled - ContentParser will handle gracefully
      },
      inject: [ConfigService],
    },

    // FirecrawlParsingStrategy - conditionally registered based on config
    {
      provide: 'IFirecrawlParsingStrategy',
      useFactory: (firecrawlClient: FirecrawlClient | null) => {
        if (firecrawlClient) {
          return new FirecrawlParsingStrategy(firecrawlClient);
        }
        return null; // Disabled - ContentParser will handle gracefully
      },
      inject: ['IFirecrawlClient'],
    },

    // JsRenderingDetector - conditionally registered based on config
    {
      provide: 'IJsRenderingDetector',
      useFactory: (configService: ConfigService) => {
        const config = loadFirecrawlConfig(configService);
        if (config.enabled && config.fallbackEnabled) {
          return new JsRenderingDetector();
        }
        return null; // Disabled - ContentParser will handle gracefully
      },
      inject: [ConfigService],
    },

    // ContentParser - with optional Firecrawl dependencies
    {
      provide: 'IContentParser',
      useClass: ContentParser,
    },

    // ===== Infrastructure =====
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
    // Command Handlers
    IngestContentCommandHandler,
    NormalizeRawContentHandler,
    ValidateContentQualityHandler,
    SaveContentItemHandler,

    // Event Handlers
    NormalizeRawContentOnContentCollected,
    ValidateContentQualityOnContentNormalized,
    CheckDuplicateAndPublishOnContentQualityValidated,
    SaveContentItemOnContentDeduplicationChecked,
    IncrementJobMetricsOnContentIngested,
    RecordValidationErrorInJobMetricsOnContentValidationFailed,

    // Query Handlers
    GetContentByHashQueryHandler,
    CheckContentDuplicateHandler,

    // Domain Services
    'IContentValidationService',
    'IContentNormalizationService',
    'IDuplicateDetectionService',

    // Parsing Services
    'IContentParser',
    'IFirecrawlClient',
    'IFirecrawlParsingStrategy',
    'IJsRenderingDetector',

    // Infrastructure
    'IContentItemReadRepository',
    'IContentItemWriteRepository',
    'IContentItemFactory',
  ],
})
export class IngestionContentModule {}
