import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentValidationFailed } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * RecordValidationErrorInJobMetricsOnContentValidationFailed
 *
 * Handles ContentValidationFailed by incrementing the job's validationErrors counter.
 * Enables real-time error tracking for job monitoring.
 *
 * Requirements: 2.3, 9.2, 9.3, 9.4
 */
@Injectable()
@EventsHandler(ContentValidationFailed)
export class RecordValidationErrorInJobMetricsOnContentValidationFailed implements IEventHandler<ContentValidationFailed> {
  private readonly logger = new Logger(
    RecordValidationErrorInJobMetricsOnContentValidationFailed.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentValidationFailed): Promise<void> {
    try {
      this.logger.warn(
        `Recording validation error for job ${event.jobId}: ${event.validationErrors.join(', ')}`,
      );

      await this.commandBus.execute(
        new UpdateJobMetricsCommand(event.jobId, {
          validationErrors: 1,
        }),
      );

      this.logger.debug(
        `Validation error recorded for job: ${event.jobId} (validationErrors +1)`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error recording validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
