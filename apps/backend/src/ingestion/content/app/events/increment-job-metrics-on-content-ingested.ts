import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { ContentIngested } from '@/ingestion/content/domain/events';
import { UpdateJobMetricsCommand } from '@/ingestion/job/app/commands/update-job-metrics';

/**
 * IncrementJobMetricsOnContentIngested
 *
 * Handles ContentIngested by incrementing the job's itemsPersisted counter.
 * Enables real-time progress tracking without blocking the ingestion process.
 *
 * Requirements: 2.1, 2.2, 3.5, 3.6
 */
@Injectable()
@EventsHandler(ContentIngested)
export class IncrementJobMetricsOnContentIngested implements IEventHandler<ContentIngested> {
  private readonly logger = new Logger(
    IncrementJobMetricsOnContentIngested.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: ContentIngested): Promise<void> {
    try {
      this.logger.debug(
        `Incrementing job metrics for job: ${event.jobId} (content: ${event.contentId})`,
      );

      await this.commandBus.execute(
        new UpdateJobMetricsCommand(event.jobId, {
          itemsPersisted: 1,
        }),
      );

      this.logger.debug(
        `Job metrics incremented for job: ${event.jobId} (itemsPersisted +1)`,
      );
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error incrementing job metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
