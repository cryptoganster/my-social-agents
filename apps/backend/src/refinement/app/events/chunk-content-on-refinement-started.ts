import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ContentRefinementStarted } from '@refinement/domain/events/content-refinement-started';
import { ChunkContentCommand } from '@refinement/app/commands/chunk-content/command';

/**
 * ChunkContentOnRefinementStarted
 *
 * Event handler that triggers content chunking when refinement starts.
 * This is the first step in the refinement pipeline after aggregate creation.
 *
 * Pipeline position: ContentRefinementStarted → ChunkContentCommand
 *
 * Requirements: Refinement 2
 * Design: Application Layer - Event Handlers (Event-Driven Pipeline)
 */
@Injectable()
@EventsHandler(ContentRefinementStarted)
export class ChunkContentOnRefinementStarted implements IEventHandler<ContentRefinementStarted> {
  private readonly logger = new Logger(ChunkContentOnRefinementStarted.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentRefinementStarted): Promise<void> {
    try {
      this.logger.debug(
        `Processing ContentRefinementStarted: refinementId=${event.refinementId}, contentItemId=${event.contentItemId}`,
      );

      await this.commandBus.execute(
        new ChunkContentCommand(event.refinementId, event.contentItemId),
      );

      this.logger.debug(
        `ChunkContentCommand executed for refinement: ${event.refinementId}`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error processing ContentRefinementStarted: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
