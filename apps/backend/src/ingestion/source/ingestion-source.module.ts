import { Module, ClassProvider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@/shared/shared.module';
import { CreateSourceCommandHandler } from './app/commands/create-source/handler';
import { UpdateSourceCommandHandler } from './app/commands/update-source/handler';
import { UpdateSourceHealthCommandHandler } from './app/commands/update-source-health/handler';
import { DisableSourceHandler } from './app/commands/disable-source/handler';
import { GetSourceByIdQueryHandler } from './app/queries/get-source-by-id/handler';
import { DisableSourceOnSourceUnhealthy } from './app/events/disable-source-on-source-unhealthy';
import { LogHealthMetricsOnSourceUnhealthy } from './app/events/log-health-metrics-on-source-unhealthy';
import { NotifyAdminsOnSourceUnhealthy } from './app/events/notify-admins-on-source-unhealthy';
import { TypeOrmSourceConfigurationWriteRepository } from './infra/persistence/repositories/source-configuration-write';
import { TypeOrmSourceConfigurationFactory } from './infra/persistence/factories/source-configuration-factory';
import { TypeOrmSourceConfigurationReadRepository } from './infra/persistence/repositories/source-configuration-read';
import { SourceConfigurationEntity } from './infra/persistence/entities/source-configuration';
import { IngestionJobEntity } from '@/ingestion/job/infra/persistence/entities/ingestion-job';
import { WebScraperAdapter } from './infra/adapters/web-scraper';
import { RssFeedAdapter } from './infra/adapters/rss-feed';
import { SocialMediaAdapter } from './infra/adapters/social-media';
import { PdfAdapter } from './infra/adapters/pdf';
import { OcrAdapter } from './infra/adapters/ocr';
import { WikipediaAdapter } from './infra/adapters/wikipedia';
import { AdapterRegistry } from './domain/services/adapter-registry';
import { SourceType, SourceTypeEnum } from './domain/value-objects/source-type';

/**
 * IngestionSourceModule
 *
 * NestJS module for the Source sub-context within Content Ingestion.
 * Handles source configuration management and provides pluggable source adapters.
 *
 * Responsibilities:
 * - Source creation (CreateSourceCommand)
 * - Source updates (UpdateSourceCommand)
 * - Source persistence (write repository)
 * - Source queries (read repository)
 * - Source reconstitution (factory)
 * - Source adapters (web scraping, RSS, social media, PDF, OCR, Wikipedia)
 * - Adapter registry for dynamic adapter selection
 *
 * Dependencies (to be provided by parent module):
 * - ICredentialEncryption (from shared sub-context)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.5, 10.1, 10.2, 10.3
 */
@Module({
  imports: [
    CqrsModule,
    SharedModule,
    TypeOrmModule.forFeature([SourceConfigurationEntity, IngestionJobEntity]),
  ],
  providers: [
    // Command Handlers
    CreateSourceCommandHandler,
    UpdateSourceCommandHandler,
    UpdateSourceHealthCommandHandler,
    DisableSourceHandler,

    // Query Handlers
    GetSourceByIdQueryHandler,

    // Event Handlers (one responsibility per handler)
    DisableSourceOnSourceUnhealthy,
    LogHealthMetricsOnSourceUnhealthy,
    NotifyAdminsOnSourceUnhealthy,

    // Write Repository with Interface Token
    {
      provide: 'ISourceConfigurationWriteRepository',
      useClass: TypeOrmSourceConfigurationWriteRepository,
    },

    // Factory with Interface Token
    {
      provide: 'ISourceConfigurationFactory',
      useClass: TypeOrmSourceConfigurationFactory,
    },

    // Read Repository - Register both class and interface token
    TypeOrmSourceConfigurationReadRepository,
    {
      provide: 'ISourceConfigurationReadRepository',
      useExisting: TypeOrmSourceConfigurationReadRepository,
    },

    // Source Adapters (register individually for direct injection)
    WebScraperAdapter,
    RssFeedAdapter,
    SocialMediaAdapter,
    PdfAdapter,
    OcrAdapter,
    WikipediaAdapter,

    // AdapterRegistry - Factory provider to initialize with all adapters
    {
      provide: 'AdapterRegistry',
      useFactory: (
        webScraper: WebScraperAdapter,
        rssFeed: RssFeedAdapter,
        socialMedia: SocialMediaAdapter,
        pdf: PdfAdapter,
        ocr: OcrAdapter,
        wikipedia: WikipediaAdapter,
      ) => {
        const registry = new AdapterRegistry();

        // Register all adapters with their corresponding source types
        registry.register(SourceType.fromEnum(SourceTypeEnum.WEB), webScraper);
        registry.register(SourceType.fromEnum(SourceTypeEnum.RSS), rssFeed);
        registry.register(
          SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA),
          socialMedia,
        );
        registry.register(SourceType.fromEnum(SourceTypeEnum.PDF), pdf);
        registry.register(SourceType.fromEnum(SourceTypeEnum.OCR), ocr);
        registry.register(
          SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA),
          wikipedia,
        );

        return registry;
      },
      inject: [
        WebScraperAdapter,
        RssFeedAdapter,
        SocialMediaAdapter,
        PdfAdapter,
        OcrAdapter,
        WikipediaAdapter,
      ],
    },

    // Also register with multi token for backward compatibility
    {
      provide: 'SourceAdapter',
      useClass: WebScraperAdapter,
      multi: true,
    } as ClassProvider,
    {
      provide: 'SourceAdapter',
      useClass: RssFeedAdapter,
      multi: true,
    } as ClassProvider,
    {
      provide: 'SourceAdapter',
      useClass: SocialMediaAdapter,
      multi: true,
    } as ClassProvider,
    {
      provide: 'SourceAdapter',
      useClass: PdfAdapter,
      multi: true,
    } as ClassProvider,
    {
      provide: 'SourceAdapter',
      useClass: OcrAdapter,
      multi: true,
    } as ClassProvider,
    {
      provide: 'SourceAdapter',
      useClass: WikipediaAdapter,
      multi: true,
    } as ClassProvider,
  ],
  exports: [
    // Export command handlers for use in other modules
    CreateSourceCommandHandler,
    UpdateSourceCommandHandler,

    // Export repository tokens for use in other modules
    'ISourceConfigurationWriteRepository',
    'ISourceConfigurationFactory',
    'ISourceConfigurationReadRepository',

    // Export individual adapters for direct injection
    WebScraperAdapter,
    RssFeedAdapter,
    SocialMediaAdapter,
    PdfAdapter,
    OcrAdapter,
    WikipediaAdapter,

    // Export AdapterRegistry for use in other modules
    'AdapterRegistry',

    // Export source adapters token for backward compatibility
    'SourceAdapter',
  ],
})
export class IngestionSourceModule {}
