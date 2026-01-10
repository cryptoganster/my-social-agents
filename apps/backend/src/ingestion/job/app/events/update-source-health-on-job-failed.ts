import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { JobFailed } from '@/ingestion/job/domain/events';
import { UpdateSourceHealthCommand } from '@/ingestion/source/app/commands/update-source-health';

/**
 * UpdateSourceHealthOnJobFailed
 *
 * Handles JobFailed by logging error details and updating source health tracking.
 * This handler centralizes failure handling logic and decouples job failure
 * from health tracking, allowing source reliability metrics to be updated asynchronously.
 *
 * Flow:
 * 1. Receive JobFailed
 * 2. Log error details for debugging
 * 3. Execute UpdateSourceHealthCommand with failure outcome
 * 4. TODO: Implement retry logic if error is retryable
 *
 * Requirements: 1.6, 1.7, 4.2, 4.4
 */
@Injectable()
@EventsHandler(JobFailed)
export class UpdateSourceHealthOnJobFailed implements IEventHandler<JobFailed> {
  private readonly logger = new Logger(UpdateSourceHealthOnJobFailed.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: JobFailed): Promise<void> {
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
        `Error handling JobFailed for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
