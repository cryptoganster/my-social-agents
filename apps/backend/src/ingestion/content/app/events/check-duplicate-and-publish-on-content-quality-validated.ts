import { EventsHandler, IEventHandler, QueryBus, EventBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentQualityValidated } from '@/ingestion/content/domain/events';
import { ContentDeduplicationChecked } from '@/ingestion/content/domain/events';
import { CheckContentDuplicateQuery } from '../queries/check-content-duplicate/query';
import { DuplicateCheckReadModel } from '../queries/read-models/duplicate-check';

/**
 * CheckDuplicateAndPublishOnContentQualityValidated
 *
 * Handles ContentQualityValidated by:
 * 1. Executing CheckContentDuplicateQuery to check for duplicates
 * 2. Publishing ContentDeduplicationChecked event with the result
 *
 * Third step in the content processing pipeline.
 *
 * Pipeline: ContentQualityValidated → CheckContentDuplicateQuery → ContentDeduplicationChecked
 *
 * Requirements: 3.2, 3.3
 */
@Injectable()
@EventsHandler(ContentQualityValidated)
export class CheckDuplicateAndPublishOnContentQualityValidated implements IEventHandler<ContentQualityValidated> {
  private readonly logger = new Logger(
    CheckDuplicateAndPublishOnContentQualityValidated.name,
  );

  constructor(
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: ContentQualityValidated): Promise<void> {
    try {
      this.logger.debug(`Checking duplicate for source: ${event.sourceId}`);

      // 1. Execute query to check for duplicate (pure read)
      const result = await this.queryBus.execute<
        CheckContentDuplicateQuery,
        DuplicateCheckReadModel
      >(new CheckContentDuplicateQuery(event.normalizedContent));

      const checkedAt = new Date();

      // 2. Publish event with the result
      await this.eventBus.publish(
        new ContentDeduplicationChecked(
          event.jobId,
          event.sourceId,
          event.rawContent,
          event.normalizedContent,
          event.metadata,
          event.assetTags,
          result.contentHash,
          result.isDuplicate,
          result.existingContentId,
          event.collectedAt,
          checkedAt,
        ),
      );

      this.logger.debug(
        `Deduplication check completed for source ${event.sourceId}: isDuplicate=${result.isDuplicate}`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error checking duplicate: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
