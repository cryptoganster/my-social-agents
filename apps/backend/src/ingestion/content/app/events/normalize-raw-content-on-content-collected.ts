import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentCollected } from '@/ingestion/content/domain/events';
import { NormalizeRawContentCommand } from '../commands/normalize-raw-content/command';

/**
 * NormalizeRawContentOnContentCollected
 *
 * Handles ContentCollected by triggering the NormalizeRawContentCommand.
 * First step in the content processing pipeline.
 *
 * Pipeline: ContentCollected → NormalizeRawContentCommand → ContentNormalized
 *
 * Requirements: 2.1, 2.2
 */
@Injectable()
@EventsHandler(ContentCollected)
export class NormalizeRawContentOnContentCollected implements IEventHandler<ContentCollected> {
  private readonly logger = new Logger(
    NormalizeRawContentOnContentCollected.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentCollected): Promise<void> {
    try {
      this.logger.debug(
        `Triggering content normalization for source: ${event.sourceId}`,
      );

      await this.commandBus.execute(
        new NormalizeRawContentCommand(
          event.jobId,
          event.sourceId,
          event.rawContent,
          event.sourceType,
          event.metadata,
          event.collectedAt,
        ),
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error triggering normalization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
