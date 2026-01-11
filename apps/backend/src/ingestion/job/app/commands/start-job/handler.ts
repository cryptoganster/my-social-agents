import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { StartJobCommand } from './command';
import { StartJobResult } from './result';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { JobStartedEvent } from '@/ingestion/job/domain/events';

/**
 * StartJobCommandHandler
 *
 * Handles starting an ingestion job.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Transition job to RUNNING state
 * 3. Persist via write repository
 * 4. Publish JobStartedEvent for downstream processing
 *
 * This is a focused command handler following single responsibility principle.
 * Content collection is triggered by TriggerContentCollectionOnJobStarted event handler.
 *
 * Requirements: 4.3, 4.4
 */
@CommandHandler(StartJobCommand)
export class StartJobCommandHandler implements ICommandHandler<
  StartJobCommand,
  StartJobResult
> {
  private readonly logger = new Logger(StartJobCommandHandler.name);

  constructor(
    @Inject('IIngestionJobFactory')
    private readonly jobFactory: IIngestionJobFactory,
    @Inject('IIngestionJobWriteRepository')
    private readonly jobWriteRepository: IIngestionJobWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: StartJobCommand): Promise<StartJobResult> {
    this.logger.log(`Starting job: ${command.jobId}`);

    // 1. Load job aggregate using factory
    const job = await this.jobFactory.load(command.jobId);

    if (!job) {
      throw new Error(`Ingestion job not found: ${command.jobId}`);
    }

    // 2. Transition job to RUNNING state
    job.start();

    // 3. Persist via write repository
    await this.jobWriteRepository.save(job);

    const startedAt = job.executedAt ?? new Date();

    // 4. Publish JobStartedEvent for downstream processing
    await this.eventBus.publish(
      new JobStartedEvent(job.id, job.sourceConfig.sourceId, startedAt),
    );

    this.logger.log(`Job started: ${command.jobId}`);

    return {
      jobId: job.id,
      sourceId: job.sourceConfig.sourceId,
      startedAt,
    };
  }
}
