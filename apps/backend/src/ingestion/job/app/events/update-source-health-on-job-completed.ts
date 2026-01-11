import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { JobCompleted } from '@/ingestion/job/domain/events';
import { UpdateSourceHealthCommand } from '@/ingestion/source/app/commands/update-source-health';

/**
 * UpdateSourceHealthOnJobCompleted
 *
 * Handles JobCompleted by updating source health tracking.
 * This handler decouples job completion from health tracking,
 * allowing source reliability metrics to be updated asynchronously.
 *
 * Flow:
 * 1. Receive JobCompleted
 * 2. Execute UpdateSourceHealthCommand with success outcome
 * 3. Pass metrics for health calculation
 *
 * Requirements: 1.5, 1.7, 4.1, 4.3
 */
@Injectable()
@EventsHandler(JobCompleted)
export class UpdateSourceHealthOnJobCompleted implements IEventHandler<JobCompleted> {
  private readonly logger = new Logger(UpdateSourceHealthOnJobCompleted.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: JobCompleted): Promise<void> {
    try {
      this.logger.debug(
        `Job completed event received for job: ${event.jobId}, source: ${event.sourceId}`,
      );

      // Update source health with success outcome
      await this.commandBus.execute(
        new UpdateSourceHealthCommand(event.sourceId, 'success', {
          itemsCollected: event.metrics.itemsCollected,
          duration: event.metrics.duration,
        }),
      );

      this.logger.debug(
        `Source health updated for source: ${event.sourceId} (success)`,
      );
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error handling JobCompleted for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
