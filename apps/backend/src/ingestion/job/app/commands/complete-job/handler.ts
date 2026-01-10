import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { CompleteJobCommand } from './command';
import { CompleteJobResult } from './result';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { JobMetrics } from '@/ingestion/job/domain/value-objects';
import { JobCompleted } from '@/ingestion/job/domain/events';

/**
 * CompleteJobCommandHandler
 *
 * Handles completing an ingestion job with final metrics.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Complete job with final metrics
 * 3. Persist via write repository
 * 4. Publish JobCompleted
 *
 * Requirements: 4.4, 4.5
 */
@CommandHandler(CompleteJobCommand)
export class CompleteJobCommandHandler implements ICommandHandler<
  CompleteJobCommand,
  CompleteJobResult
> {
  private readonly logger = new Logger(CompleteJobCommandHandler.name);

  constructor(
    @Inject('IIngestionJobFactory')
    private readonly jobFactory: IIngestionJobFactory,
    @Inject('IIngestionJobWriteRepository')
    private readonly jobWriteRepository: IIngestionJobWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteJobCommand): Promise<CompleteJobResult> {
    this.logger.log(`Completing job: ${command.jobId}`);

    // 1. Load job aggregate using factory
    const job = await this.jobFactory.load(command.jobId);

    if (!job) {
      throw new Error(`Ingestion job not found: ${command.jobId}`);
    }

    // 2. Create metrics value object and complete job
    const metrics = JobMetrics.create({
      itemsCollected: command.finalMetrics.itemsCollected,
      duplicatesDetected: command.finalMetrics.duplicatesDetected,
      errorsEncountered: command.finalMetrics.errorsEncountered,
      bytesProcessed: command.finalMetrics.bytesProcessed,
      durationMs: command.finalMetrics.durationMs,
    });

    job.complete(metrics);

    // 3. Persist via write repository
    await this.jobWriteRepository.save(job);

    const completedAt = job.completedAt ?? new Date();

    // 4. Publish JobCompleted
    await this.eventBus.publish(
      new JobCompleted(
        job.id,
        job.sourceConfig.sourceId,
        {
          itemsCollected: metrics.itemsCollected,
          itemsPersisted:
            metrics.itemsCollected -
            metrics.duplicatesDetected -
            metrics.errorsEncountered,
          duplicatesDetected: metrics.duplicatesDetected,
          validationErrors: metrics.errorsEncountered,
          duration: metrics.durationMs,
        },
        completedAt,
      ),
    );

    this.logger.log(
      `Job completed: ${command.jobId} - ${metrics.itemsCollected} items, ${metrics.durationMs}ms`,
    );

    return {
      jobId: job.id,
      completedAt,
      metrics: {
        itemsCollected: metrics.itemsCollected,
        duplicatesDetected: metrics.duplicatesDetected,
        errorsEncountered: metrics.errorsEncountered,
        bytesProcessed: metrics.bytesProcessed,
        durationMs: metrics.durationMs,
      },
    };
  }
}
