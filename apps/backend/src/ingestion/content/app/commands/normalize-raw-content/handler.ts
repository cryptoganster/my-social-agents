import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { NormalizeRawContentCommand } from './command';
import { NormalizeRawContentResult } from './result';
import { IContentNormalizationService } from '@/ingestion/content/domain/interfaces/services/content-normalization';
import { ContentNormalized } from '@/ingestion/content/domain/events';
import { SourceType } from '@/ingestion/source/domain/value-objects';

/**
 * NormalizeRawContentHandler
 *
 * Handles NormalizeRawContentCommand by:
 * 1. Normalizing raw content using the normalization service
 * 2. Extracting metadata from the content
 * 3. Detecting asset tags (crypto symbols)
 * 4. Publishing ContentNormalized event
 *
 * Requirements: 2.1, 2.2
 */
@Injectable()
@CommandHandler(NormalizeRawContentCommand)
export class NormalizeRawContentHandler implements ICommandHandler<
  NormalizeRawContentCommand,
  NormalizeRawContentResult
> {
  private readonly logger = new Logger(NormalizeRawContentHandler.name);

  constructor(
    @Inject('IContentNormalizationService')
    private readonly normalizationService: IContentNormalizationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: NormalizeRawContentCommand,
  ): Promise<NormalizeRawContentResult> {
    this.logger.debug(`Normalizing content for source: ${command.sourceId}`);

    // 1. Normalize content
    const sourceType = SourceType.fromString(command.sourceType);
    const normalizedContent = this.normalizationService.normalize(
      command.rawContent,
      sourceType,
    );

    // 2. Extract metadata (merge with command metadata)
    const extractedMetadata = this.normalizationService.extractMetadata(
      command.rawContent,
      sourceType,
    );

    const metadata = {
      title: command.metadata.title ?? extractedMetadata.title ?? undefined,
      author: command.metadata.author ?? extractedMetadata.author ?? undefined,
      publishedAt:
        command.metadata.publishedAt ??
        extractedMetadata.publishedAt ??
        undefined,
      language:
        command.metadata.language ?? extractedMetadata.language ?? undefined,
      sourceUrl:
        command.metadata.sourceUrl ?? extractedMetadata.sourceUrl ?? undefined,
    };

    // 3. Detect asset tags
    const assetTags = this.normalizationService.detectAssets(normalizedContent);
    const assetTagSymbols = assetTags.map((tag) => tag.symbol);

    const normalizedAt = new Date();

    // 4. Publish ContentNormalized event
    const event = new ContentNormalized(
      command.jobId,
      command.sourceId,
      command.rawContent,
      normalizedContent,
      {
        title: metadata.title,
        author: metadata.author,
        publishedAt: metadata.publishedAt,
        language: metadata.language,
        sourceUrl: metadata.sourceUrl,
      },
      assetTagSymbols,
      command.collectedAt,
      normalizedAt,
    );

    await this.eventBus.publish(event);

    this.logger.debug(`Content normalized for source: ${command.sourceId}`);

    return new NormalizeRawContentResult(
      normalizedContent,
      metadata,
      assetTagSymbols,
      normalizedAt,
    );
  }
}
