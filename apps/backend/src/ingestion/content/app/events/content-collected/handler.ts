import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ContentCollectedEvent,
  ContentIngestedEvent,
} from '@/ingestion/content/domain/events';
import { IContentItemReadRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-read';
import { IContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { IContentValidationService } from '@/ingestion/content/domain/interfaces/services/content-validation';
import { IContentNormalizationService } from '@/ingestion/content/domain/interfaces/services/content-normalization';
import { IDuplicateDetectionService } from '@/ingestion/content/domain/interfaces/services/duplicate-detection';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { SourceType } from '@/ingestion/source/domain/value-objects';

/**
 * ContentCollectedEventHandler
 *
 * Handles ContentCollectedEvent by processing individual content items:
 * 1. Normalize content
 * 2. Extract and merge metadata
 * 3. Validate content quality
 * 4. Detect duplicates
 * 5. Persist non-duplicate content
 * 6. Publish ContentIngestedEvent
 *
 * This handler implements the write-side processing pipeline,
 * ensuring proper separation between collection (command) and processing (event).
 *
 * Requirements: 2.1-2.5, 3.1-3.4, 7.1-7.5, 10.1-10.5
 */
@EventsHandler(ContentCollectedEvent)
export class ContentCollectedEventHandler implements IEventHandler<ContentCollectedEvent> {
  private readonly logger = new Logger(ContentCollectedEventHandler.name);

  constructor(
    @Inject('IContentItemReadRepository')
    private readonly contentItemReadRepo: IContentItemReadRepository,
    @Inject('IContentItemWriteRepository')
    private readonly contentItemWriteRepo: IContentItemWriteRepository,
    @Inject('IContentValidationService')
    private readonly validationService: IContentValidationService,
    @Inject('IContentNormalizationService')
    private readonly normalizationService: IContentNormalizationService,
    @Inject('IDuplicateDetectionService')
    private readonly duplicateDetectionService: IDuplicateDetectionService,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Handles ContentCollectedEvent
   *
   * Pipeline: normalize → validate → deduplicate → persist → publish event
   */
  async handle(event: ContentCollectedEvent): Promise<void> {
    try {
      this.logger.debug(`Processing content from source: ${event.sourceId}`);

      // 1. Normalize content
      const sourceType = SourceType.fromString(event.sourceType);
      const normalizedContent = this.normalizationService.normalize(
        event.rawContent,
        sourceType,
      );

      // 2. Extract metadata (merge with event metadata)
      const extractedMetadata = this.normalizationService.extractMetadata(
        event.rawContent,
        sourceType,
      );

      const metadata = ContentMetadata.create({
        title: event.metadata.title ?? extractedMetadata.title,
        author: event.metadata.author ?? extractedMetadata.author,
        publishedAt:
          event.metadata.publishedAt ?? extractedMetadata.publishedAt,
        language: event.metadata.language ?? extractedMetadata.language,
        sourceUrl: event.metadata.sourceUrl ?? extractedMetadata.sourceUrl,
      });

      // 3. Validate content quality
      const validationResult = this.validationService.validateQuality(
        normalizedContent,
        metadata,
      );

      if (!validationResult.isValid) {
        this.logger.warn(
          `Content validation failed: ${validationResult.errors.join(', ')}`,
        );
        // Don't persist invalid content
        return;
      }

      // 4. Compute content hash
      const contentHash =
        this.duplicateDetectionService.computeHash(normalizedContent);

      // 5. Check for duplicates (read-side query)
      const existingContent =
        await this.contentItemReadRepo.findByHash(contentHash);

      if (existingContent) {
        this.logger.debug(
          `Duplicate content detected: ${contentHash.toString()}`,
        );
        this.duplicateDetectionService.recordHash(contentHash);
        // Don't persist duplicates
        return;
      }

      // 6. Detect asset tags
      const assetTags =
        this.normalizationService.detectAssets(normalizedContent);

      // 7. Create ContentItem aggregate
      const contentItem = ContentItem.create({
        contentId: uuidv4(),
        sourceId: event.sourceId,
        contentHash,
        rawContent: event.rawContent,
        normalizedContent,
        metadata,
        assetTags,
        collectedAt: event.collectedAt,
      });

      // 8. Persist content item (write-side)
      await this.contentItemWriteRepo.save(contentItem);

      // 9. Publish ContentIngestedEvent
      const ingestedEvent = new ContentIngestedEvent(
        contentItem.contentId,
        contentItem.sourceId,
        contentItem.contentHash.toString(),
        contentItem.assetTags.map((tag) => tag.symbol),
        contentItem.collectedAt,
      );

      await this.eventBus.publish(ingestedEvent);

      this.logger.debug(
        `Content item persisted and event published: ${contentItem.contentId}`,
      );
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error processing ContentCollectedEvent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
