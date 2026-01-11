import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { JobStartedEvent } from '@/ingestion/job/domain/events';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content';
import { IngestContentResult } from '@/ingestion/content/app/commands/ingest-content';
import { CompleteJobCommand } from '@/ingestion/job/app/commands/complete-job';
import { FailJobCommand } from '@/ingestion/job/app/commands/fail-job';
import { IRetryService } from '@/shared/interfaces/retry';

/**
 * IngestContentOnJobStarted
 *
 * Handles JobStarted by ingesting content from the configured source.
 * This is the bridge between job lifecycle and content ingestion.
 *
 * Pipeline: JobStarted → IngestContentCommand → ContentCollected → ... → CompleteJobCommand
 *
 * Includes retry logic for transient failures.
 * On persistent failure, triggers FailJobCommand.
 * On success, triggers CompleteJobCommand with metrics.
 *
 * Requirements: 4.3, 4.4, 10.1, 10.2
 */
@Injectable()
@EventsHandler(JobStartedEvent)
export class IngestContentOnJobStarted implements IEventHandler<JobStartedEvent> {
  private readonly logger = new Logger(IngestContentOnJobStarted.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject('IRetryService')
    private readonly retryService: IRetryService,
  ) {}

  async handle(event: JobStartedEvent): Promise<void> {
    try {
      this.logger.debug(
        `Ingesting content for job: ${event.jobId}, source: ${event.sourceId}`,
      );

      // Execute with retry for transient failures
      const retryResult = await this.retryService.execute<IngestContentResult>(
        async () => {
          return await this.commandBus.execute(
            new IngestContentCommand(event.sourceId),
          );
        },
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          backoffMultiplier: 2,
          maxDelayMs: 30000,
        },
      );

      if (!retryResult.success) {
        throw retryResult.error ?? new Error('Content ingestion failed');
      }

      this.logger.debug(`Content ingestion completed for job: ${event.jobId}`);

      // Complete the job with metrics from ingestion result
      const ingestionResult = retryResult.value;
      const endTime = Date.now();
      await this.commandBus.execute(
        new CompleteJobCommand(event.jobId, {
          itemsCollected: ingestionResult?.itemsCollected ?? 0,
          duplicatesDetected: ingestionResult?.duplicatesDetected ?? 0,
          errorsEncountered: ingestionResult?.validationErrors ?? 0,
          bytesProcessed: 0, // Not tracked in current implementation
          durationMs: endTime - event.startedAt.getTime(),
        }),
      );

      this.logger.debug(`Job completed: ${event.jobId}`);
    } catch (error) {
      // Log error
      this.logger.error(
        `Content ingestion failed for job ${event.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Trigger job failure
      try {
        await this.commandBus.execute(
          new FailJobCommand(
            event.jobId,
            error instanceof Error ? error.message : 'Unknown error',
            'INGESTION_ERROR',
            error instanceof Error ? error.stack : undefined,
          ),
        );
      } catch (failError) {
        // Error isolation: log but don't rethrow
        this.logger.error(
          `Failed to mark job as failed: ${failError instanceof Error ? failError.message : 'Unknown error'}`,
          failError instanceof Error ? failError.stack : undefined,
        );
      }
    }
  }
}
