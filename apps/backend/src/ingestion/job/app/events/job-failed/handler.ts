import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobFailedEvent } from '@/ingestion/job/domain/events';
import { UpdateSourceHealthCommand } from '@/ingestion/source/app/commands/update-source-health';

/**
 * JobFailedEventHandler
 *
 * Handles JobFailedEvent by logging error details and updating source health tracking.
 * This handler centralizes failure handling logic and decouples job failure
 * from health tracking, allowing source reliability metrics to be updated asynchronously.
 *
 * Flow:
 * 1. Receive JobFailedEvent
 * 2. Log error details for debugging
 * 3. Execute UpdateSourceHealthCommand with failure outcome
 * 4. TODO: Implement retry logic if error is retryable
 *
 * Requirements: 1.6, 1.7, 4.2, 4.4
 * Design: Event Handlers - Job Event Handlers
 */
@EventsHandler(JobFailedEvent)
export class JobFailedEventHandler implements IEventHandler<JobFailedEvent> {
  private readonly logger = new Logger(JobFailedEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Handles JobFailedEvent
   *
   * Logs error and updates source health with failure outcome
   */
  async handle(event: JobFailedEvent): Promise<void> {
    try {
      // Log failure details
      this.logger.error(
        `Job ${event.jobId} failed for source ${event.sourceId}: ${event.error.message}`,
        event.error.stack,
      );

      // Update source health with failure outcome
      await this.commandBus.execute(
        new UpdateSourceHealthCommand(event.sourceId, 'failure'),
      );

      this.logger.debug(
        `Source health updated for source: ${event.sourceId} (failure)`,
      );

      // TODO: Implement retry logic if error is retryable
      // Check error type and determine if retry is appropriate
      // If retryable, schedule retry with exponential backoff
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error handling JobFailedEvent for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
