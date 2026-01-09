import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { ContentIngestedEvent } from '@/ingestion/content/domain/events/content-ingested';
import { RefineContentCommand } from '@refinement/app/commands/refine-content/command';
import { RefinementConfig } from '@refinement/domain/value-objects/refinement-config';

/**
 * ContentIngestedEventHandler
 *
 * Listens to ContentIngestedEvent from the Ingestion bounded context
 * and automatically triggers content refinement.
 *
 * This is the primary mechanism for cross-context communication,
 * following event-driven architecture principles:
 * - Loose coupling between contexts
 * - Asynchronous processing
 * - Error isolation (log but don't rethrow)
 *
 * Requirements: Refinement 1, Event-Driven Architecture
 * Design: Application Layer - Event Handlers
 * Steering: 14-event-driven-architecture.md - Pattern 1: Event → Command
 */
@Injectable()
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler implements IEventHandler<ContentIngestedEvent> {
  private readonly logger = new Logger(ContentIngestedEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Handles ContentIngestedEvent by triggering refinement
   *
   * Error Isolation: Errors are logged but not rethrown to allow
   * other event handlers to continue processing.
   *
   * @param event - The content ingested event from ingestion context
   */
  async handle(event: ContentIngestedEvent): Promise<void> {
    try {
      this.logger.debug(`Processing ContentIngestedEvent: ${event.contentId}`);

      // Trigger refinement command with default configuration
      await this.commandBus.execute(
        new RefineContentCommand(event.contentId, RefinementConfig.default()),
      );

      this.logger.debug(`Refinement triggered for content: ${event.contentId}`);
    } catch (error) {
      // Error isolation: log but don't rethrow
      // This allows other event handlers to continue processing
      this.logger.error(
        `Error processing ContentIngestedEvent for ${event.contentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - allows other handlers to continue
    }
  }
}
