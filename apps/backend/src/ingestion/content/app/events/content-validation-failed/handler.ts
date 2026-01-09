import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ContentValidationFailedEvent } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * ContentValidationFailedEventHandler
 *
 * Handles ContentValidationFailedEvent by tracking validation failures
 * in job metrics. This handler centralizes validation failure handling
 * and enables real-time error tracking.
 *
 * Flow:
 * 1. Receive ContentValidationFailedEvent
 * 2. Log validation errors
 * 3. Execute UpdateJobMetricsCommand to increment validationErrors
 *
 * Requirements: 2.3, 9.2, 9.3, 9.4
 * Design: Event Handlers - Content Event Handlers
 */
@EventsHandler(ContentValidationFailedEvent)
export class ContentValidationFailedEventHandler implements IEventHandler<ContentValidationFailedEvent> {
  private readonly logger = new Logger(
    ContentValidationFailedEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Handles ContentValidationFailedEvent
   *
   * Logs validation errors and updates job metrics
   */
  async handle(event: ContentValidationFailedEvent): Promise<void> {
    try {
      // Log validation failure
      this.logger.warn(
        `Content validation failed for job ${event.jobId}: ${event.validationErrors.join(', ')}`,
      );

      // Update job metrics
      await this.commandBus.execute(
        new UpdateJobMetricsCommand(event.jobId, {
          validationErrors: 1, // increment by 1
        }),
      );

      this.logger.debug(
        `Job metrics updated for job: ${event.jobId} (validationErrors +1)`,
      );
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error handling ContentValidationFailedEvent for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
