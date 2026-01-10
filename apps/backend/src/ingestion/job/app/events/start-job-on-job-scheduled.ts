import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { JobScheduled } from '@/ingestion/job/domain/events';
import { StartJobCommand } from '@/ingestion/job/app/commands/start-job';

/**
 * StartJobOnJobScheduled
 *
 * Handles JobScheduled by triggering job start.
 * This handler bridges the gap between job scheduling and execution,
 * allowing scheduling to complete quickly while execution happens asynchronously.
 *
 * Pipeline: JobScheduled → StartJobCommand → JobStarted → IngestContentOnJobStarted
 *
 * Requirements: 1.2, 1.3
 */
@Injectable()
@EventsHandler(JobScheduled)
export class StartJobOnJobScheduled implements IEventHandler<JobScheduled> {
  private readonly logger = new Logger(StartJobOnJobScheduled.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: JobScheduled): Promise<void> {
    try {
      this.logger.debug(
        `Job scheduled event received for job: ${event.jobId}, source: ${event.sourceId}`,
      );

      // Trigger job start (not execution - that's handled by event pipeline)
      await this.commandBus.execute(new StartJobCommand(event.jobId));

      this.logger.debug(`Job start triggered for job: ${event.jobId}`);
    } catch (error) {
      // Error isolation: log error but don't rethrow
      this.logger.error(
        `Error handling JobScheduled for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
