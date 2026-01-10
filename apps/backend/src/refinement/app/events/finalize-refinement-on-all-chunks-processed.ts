import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { AllChunksProcessed } from '@refinement/domain/events/all-chunks-processed';
import { FinalizeRefinementCommand } from '@refinement/app/commands/finalize-refinement/command';

/**
 * FinalizeRefinementOnAllChunksProcessed
 *
 * Event handler that triggers refinement finalization when all chunks are processed.
 * This is the final step in the refinement pipeline.
 *
 * Pipeline position: AllChunksProcessed → FinalizeRefinementCommand
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Event Handlers (Event-Driven Pipeline)
 */
@Injectable()
@EventsHandler(AllChunksProcessed)
export class FinalizeRefinementOnAllChunksProcessed implements IEventHandler<AllChunksProcessed> {
  private readonly logger = new Logger(
    FinalizeRefinementOnAllChunksProcessed.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: AllChunksProcessed): Promise<void> {
    try {
      this.logger.debug(
        `Processing AllChunksProcessed: refinementId=${event.refinementId}, validChunks=${event.validChunks}/${event.totalChunks}`,
      );

      await this.commandBus.execute(
        new FinalizeRefinementCommand(
          event.refinementId,
          event.contentItemId,
          event.totalChunks,
          event.validChunks,
        ),
      );

      this.logger.debug(
        `FinalizeRefinementCommand executed for refinement: ${event.refinementId}`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error processing AllChunksProcessed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
