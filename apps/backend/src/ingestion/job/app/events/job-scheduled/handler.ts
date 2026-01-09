import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobScheduledEvent } from '@/ingestion/job/domain/events';
import { ExecuteIngestionJobCommand } from '@/ingestion/job/app/commands/execute-job';

/**
 * JobScheduledEventHandler
 *
 * Handles JobScheduledEvent by triggering job execution.
 * This handler bridges the gap between job scheduling and execution,
 * allowing scheduling to complete quickly while execution happens asynchronously.
 *
 * Flow:
 * 1. Receive JobScheduledEvent
 * 2. Execute ExecuteJobCommand to start job
 *
 * Requirements: 1.2, 1.3
 * Design: Event Handlers - Job Event Handlers
 */
@EventsHandler(JobScheduledEvent)
export class JobScheduledEventHandler implements IEventHandler<JobScheduledEvent> {
  private readonly logger = new Logger(JobScheduledEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Handles JobScheduledEvent
   *
   * Triggers job execution by dispatching ExecuteJobCommand
   */
  async handle(event: JobScheduledEvent): Promise<void> {
    try {
      this.logger.debug(
        `Job scheduled event received for job: ${event.jobId}, source: ${event.sourceId}`,
      );

      // Trigger job execution
      await this.commandBus.execute(
        new ExecuteIngestionJobCommand(event.jobId),
      );

      this.logger.debug(`Job execution triggered for job: ${event.jobId}`);
    } catch (error) {
      // Error isolation: log error but don't rethrow
      // This allows other events to continue processing
      this.logger.error(
        `Error handling JobScheduledEvent for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
