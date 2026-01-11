import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentDeduplicationChecked } from '@/ingestion/content/domain/events';
import { SaveContentItemCommand } from '../commands/save-content-item/command';

/**
 * SaveContentItemOnContentDeduplicationChecked
 *
 * Handles ContentDeduplicationChecked by triggering the SaveContentItemCommand.
 * Only triggers if content is NOT a duplicate.
 * Fourth and final step in the content processing pipeline.
 *
 * Pipeline: ContentDeduplicationChecked (isDuplicate: false) → SaveContentItemCommand → ContentIngested
 *
 * Requirements: 3.1, 3.2, 3.3
 */
@Injectable()
@EventsHandler(ContentDeduplicationChecked)
export class SaveContentItemOnContentDeduplicationChecked implements IEventHandler<ContentDeduplicationChecked> {
  private readonly logger = new Logger(
    SaveContentItemOnContentDeduplicationChecked.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentDeduplicationChecked): Promise<void> {
    // Only save if NOT a duplicate
    if (event.isDuplicate) {
      this.logger.debug(
        `Skipping save for duplicate content: ${event.contentHash}`,
      );
      return;
    }

    try {
      this.logger.debug(
        `Triggering content item save for source: ${event.sourceId}`,
      );

      await this.commandBus.execute(
        new SaveContentItemCommand(
          event.jobId,
          event.sourceId,
          event.rawContent,
          event.normalizedContent,
          event.metadata,
          event.assetTags,
          event.contentHash,
          event.collectedAt,
        ),
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error triggering save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
