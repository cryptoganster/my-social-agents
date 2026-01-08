import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ContentIngestedEvent } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * ContentIngestedEventHandler
 *
 * Handles ContentIngestedEvent by updating job metrics in real-time.
 * This handler enables real-time progress tracking without blocking
 * the ingestion process.
 *
 * Flow:
 * 1. Receive ContentIngestedEvent
 * 2. Execute UpdateJobMetricsCommand to increment itemsPersisted
 *
 * Requirements: 2.1, 2.2, 3.5, 3.6
 * Design: Event Handlers - Content Event Handlers
 */
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler implements IEventHandler<ContentIngestedEvent> {
  private readonly logger = new Logger(ContentIngestedEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Handles ContentIngestedEvent
   *
   * Updates job metrics by incrementing itemsPersisted counter
   */
  async handle(event: ContentIngestedEvent): Promise<void> {
    try {
      this.logger.debug(
        `Content ingested event received for content: ${event.contentId}, job: ${event.jobId}`,
      );

      // Update job metrics in real-time
      await this.commandBus.execute(
        new UpdateJobMetricsCommand(event.jobId, {
          itemsPersisted: 1, // increment by 1
        }),
      );

      this.logger.debug(
        `Job metrics updated for job: ${event.jobId} (itemsPersisted +1)`,
      );
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error handling ContentIngestedEvent for content ${event.contentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
