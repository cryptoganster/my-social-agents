import { EventsHandler, IEventHandler, EventBus, QueryBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ContentCollectedEvent,
  ContentIngestedEvent,
  ContentValidationFailedEvent,
} from '@/ingestion/content/domain/events';
import { IContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { IContentValidationService } from '@/ingestion/content/domain/interfaces/services/content-validation';
import { IContentNormalizationService } from '@/ingestion/content/domain/interfaces/services/content-normalization';
import { IDuplicateDetectionService } from '@/ingestion/content/domain/interfaces/services/duplicate-detection';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import { SourceType } from '@/ingestion/source/domain/value-objects';
import { GetContentByHashQuery } from '../../queries/get-content-by-hash/query';

/**
 * ContentCollectedEventHandler
 *
 * Handles ContentCollectedEvent by processing individual content items:
 * 1. Normalize content
 * 2. Extract and merge metadata
 * 3. Validate content quality
 * 4. Check for duplicates using GetContentByHashQuery
 * 5. Persist non-duplicate content
 * 6. Publish ContentIngestedEvent or ContentValidationFailedEvent
 *
 * This handler implements the write-side processing pipeline,
 * ensuring proper separation between collection (command) and processing (event).
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */
@EventsHandler(ContentCollectedEvent)
export class ContentCollectedEventHandler implements IEventHandler<ContentCollectedEvent> {
  private readonly logger = new Logger(ContentCollectedEventHandler.name);

  constructor(
    @Inject('IContentItemWriteRepository')
    private readonly contentItemWriteRepo: IContentItemWriteRepository,
    @Inject('IContentValidationService')
    private readonly validationService: IContentValidationService,
    @Inject('IContentNormalizationService')
    private readonly normalizationService: IContentNormalizationService,
    @Inject('IDuplicateDetectionService')
    private readonly duplicateDetectionService: IDuplicateDetectionService,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Handles ContentCollectedEvent
   *
   * Pipeline: normalize → validate → deduplicate (via query) → persist → publish event
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

        // Publish ContentValidationFailedEvent
        const validationFailedEvent = new ContentValidationFailedEvent(
          event.jobId,
          event.sourceId,
          event.rawContent.substring(0, 200), // Truncate content
          validationResult.errors,
          new Date(),
        );

        await this.eventBus.publish(validationFailedEvent);
        return;
      }

      // 4. Compute content hash
      const contentHash =
        this.duplicateDetectionService.computeHash(normalizedContent);

      // 5. Check for duplicates using GetContentByHashQuery
      const existingContent: unknown = await this.queryBus.execute(
        new GetContentByHashQuery(contentHash.toString()),
      );

      if (existingContent) {
        this.logger.debug(
          `Duplicate content detected: ${contentHash.toString()}`,
        );
        this.duplicateDetectionService.recordHash(contentHash);
        // Don't persist duplicates - duplicate counter will be incremented by event handler
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
        event.jobId,
        contentItem.contentHash.toString(),
        normalizedContent,
        {
          title: metadata.title ?? undefined,
          author: metadata.author ?? undefined,
          publishedAt: metadata.publishedAt ?? undefined,
          language: metadata.language ?? undefined,
          sourceUrl: metadata.sourceUrl ?? undefined,
        },
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
