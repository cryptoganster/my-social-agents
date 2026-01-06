import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { IngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { JobMetrics } from '@/ingestion/job/domain/value-objects';
import { IngestContentCommand } from '@/ingestion/content/app/commands/ingest-content/command';
import { IngestContentResult } from '@/ingestion/content/app/commands/ingest-content/result';
import { IRetryService } from '@/ingestion/shared/interfaces/external/retry';
import { ICircuitBreaker } from '@/ingestion/shared/interfaces/external/circuit-breaker';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/shared/entities/error-record';
import { ExecuteIngestionJobCommand } from './command';
import { ExecuteIngestionJobResult } from './result';

/**
 * ExecuteIngestionJobCommandHandler
 *
 * Handles the execution of ingestion jobs following CQRS principles.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Transition job to running state
 * 3. Invoke IngestContentCommand handler
 * 4. Update job with metrics
 * 5. Persist updated job
 * 6. Handle errors and retries using RetryService and CircuitBreaker
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
@CommandHandler(ExecuteIngestionJobCommand)
export class ExecuteIngestionJobCommandHandler implements ICommandHandler<
  ExecuteIngestionJobCommand,
  ExecuteIngestionJobResult
> {
  private readonly logger = new Logger(ExecuteIngestionJobCommandHandler.name);

  constructor(
    @Inject('IngestionJobFactory')
    private readonly jobFactory: IngestionJobFactory,
    @Inject('IngestionJobWriteRepository')
    private readonly jobWriteRepository: IngestionJobWriteRepository,
    private readonly commandBus: CommandBus,
    @Inject('IRetryService')
    private readonly retryService: IRetryService,
    @Inject('ICircuitBreaker')
    private readonly circuitBreaker: ICircuitBreaker,
  ) {}

  /**
   * Executes the ExecuteIngestionJobCommand
   *
   * Pipeline: load job → start → ingest content → update metrics → persist
   * Uses retry logic and circuit breaker for resilience
   */
  async execute(
    command: ExecuteIngestionJobCommand,
  ): Promise<ExecuteIngestionJobResult> {
    const startTime = Date.now();

    try {
      // 1. Load job aggregate using factory
      this.logger.log(`Loading ingestion job: ${command.jobId}`);
      const job = await this.jobFactory.load(command.jobId);

      if (!job) {
        throw new Error(`Ingestion job not found: ${command.jobId}`);
      }

      // 2. Transition job to running state
      this.logger.log(`Starting job execution: ${command.jobId}`);
      job.start();
      await this.jobWriteRepository.save(job);

      // 3. Execute content ingestion with retry and circuit breaker
      let ingestResult: IngestContentResult;

      try {
        // Wrap ingestion in circuit breaker and retry logic
        const retryResult = await this.retryService.execute(
          async () => {
            return await this.circuitBreaker.execute(async () => {
              // Invoke IngestContentCommand handler
              this.logger.log(
                `Invoking IngestContentCommand for source: ${job.sourceConfig.sourceId}`,
              );
              return await this.commandBus.execute<
                IngestContentCommand,
                IngestContentResult
              >(new IngestContentCommand(job.sourceConfig.sourceId));
            });
          },
          {
            maxAttempts: 3, // Fewer retries for job execution
            initialDelayMs: 2000, // 2 seconds
            backoffMultiplier: 2,
            maxDelayMs: 30000, // 30 seconds
          },
        );

        if (!retryResult.success || !retryResult.value) {
          throw (
            retryResult.error || new Error('Ingestion failed without error')
          );
        }

        ingestResult = retryResult.value;
        this.logger.log(
          `Content ingestion completed: ${ingestResult.itemsCollected} items collected`,
        );
      } catch (error) {
        // Handle ingestion failure
        const errorRecord = ErrorRecord.create({
          errorType: ErrorType.UNKNOWN_ERROR,
          message:
            error instanceof Error ? error.message : 'Unknown ingestion error',
          stackTrace: error instanceof Error ? error.stack : undefined,
        });

        // Mark job as failed
        job.fail(errorRecord);
        await this.jobWriteRepository.save(job);

        this.logger.error(
          `Job ${command.jobId} failed: ${errorRecord.message}`,
          errorRecord.stackTrace,
        );

        // Return failure result
        return {
          jobId: command.jobId,
          success: false,
          itemsCollected: 0,
          duplicatesDetected: 0,
          errorsEncountered: 1,
          bytesProcessed: 0,
          durationMs: Date.now() - startTime,
          error: errorRecord.message,
        };
      }

      // 4. Calculate metrics
      const durationMs = Date.now() - startTime;

      // Estimate bytes processed (rough estimate based on items)
      // In a real implementation, this would be tracked during ingestion
      const estimatedBytesPerItem = 1024; // 1KB average
      const bytesProcessed =
        ingestResult.itemsCollected * estimatedBytesPerItem;

      const metrics = JobMetrics.create({
        itemsCollected: ingestResult.itemsCollected,
        duplicatesDetected: ingestResult.duplicatesDetected,
        errorsEncountered:
          ingestResult.validationErrors + ingestResult.errors.length,
        bytesProcessed,
        durationMs,
      });

      // 5. Complete job with metrics
      this.logger.log(`Completing job ${command.jobId} with metrics`);
      job.complete(metrics);

      // 6. Persist updated job
      await this.jobWriteRepository.save(job);

      this.logger.log(
        `Job ${command.jobId} completed successfully: ` +
          `${metrics.itemsCollected} items, ${metrics.duplicatesDetected} duplicates, ` +
          `${metrics.errorsEncountered} errors, ${metrics.durationMs}ms`,
      );

      return {
        jobId: command.jobId,
        success: true,
        itemsCollected: metrics.itemsCollected,
        duplicatesDetected: metrics.duplicatesDetected,
        errorsEncountered: metrics.errorsEncountered,
        bytesProcessed: metrics.bytesProcessed,
        durationMs: metrics.durationMs,
      };
    } catch (error) {
      // Fatal error: log and rethrow
      this.logger.error(
        `Fatal error executing ingestion job ${command.jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Try to load and fail the job if possible
      try {
        const job = await this.jobFactory.load(command.jobId);
        if (job) {
          const errorRecord = ErrorRecord.create({
            errorType: ErrorType.UNKNOWN_ERROR,
            message:
              error instanceof Error ? error.message : 'Unknown system error',
            stackTrace: error instanceof Error ? error.stack : undefined,
          });
          job.fail(errorRecord);
          await this.jobWriteRepository.save(job);
        }
      } catch (saveError) {
        this.logger.error(
          `Failed to save error state for job ${command.jobId}`,
          saveError instanceof Error ? saveError.stack : undefined,
        );
      }

      throw error;
    }
  }
}
