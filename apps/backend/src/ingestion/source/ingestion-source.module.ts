import { Module, ClassProvider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigureSourceCommandHandler } from './app/commands/configure-source/handler';
import { TypeOrmSourceConfigurationWriteRepository } from './infra/persistence/repositories/source-configuration-write';
import { TypeOrmSourceConfigurationFactory } from './infra/persistence/factories/source-configuration-factory';
import { TypeOrmSourceConfigurationReadRepository } from './infra/persistence/repositories/source-configuration-read';
import { WebScraperAdapter } from './infra/adapters/web-scraper';
import { RssFeedAdapter } from './infra/adapters/rss-feed';
import { SocialMediaAdapter } from './infra/adapters/social-media';
import { PdfAdapter } from './infra/adapters/pdf';
import { OcrAdapter } from './infra/adapters/ocr';
import { WikipediaAdapter } from './infra/adapters/wikipedia';

/**
 * IngestionSourceModule
 *
 * NestJS module for the Source sub-context within Content Ingestion.
 * Handles source configuration management and provides pluggable source adapters.
 *
 * Responsibilities:
 * - Source configuration (ConfigureSourceCommand)
 * - Source persistence (write repository)
 * - Source queries (read repository)
 * - Source reconstitution (factory)
 * - Source adapters (web scraping, RSS, social media, PDF, OCR, Wikipedia)
 *
 * Dependencies (to be provided by parent module):
 * - ICredentialEncryption (from shared sub-context)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.5
 */
@Module({
  imports: [CqrsModule],
  providers: [
    // Command Handlers
    ConfigureSourceCommandHandler,

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

    // Read Repository with Interface Token
    {
      provide: 'ISourceConfigurationReadRepository',
      useClass: TypeOrmSourceConfigurationReadRepository,
    },

    // Source Adapters (all registered with 'SourceAdapter' token)
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
    // Export command handler for use in other modules
    ConfigureSourceCommandHandler,

    // Export repository tokens for use in other modules
    'ISourceConfigurationWriteRepository',
    'ISourceConfigurationFactory',
    'ISourceConfigurationReadRepository',

    // Export source adapters for use in other modules
    'SourceAdapter',
  ],
})
export class IngestionSourceModule {}
