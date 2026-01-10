import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { JobScheduled } from '@/ingestion/job/domain/events/job-scheduled';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { ScheduleJobCommand } from './command';
import { ScheduleJobResult } from './result';

/**
 * ScheduleJobCommandHandler
 *
 * Handles the scheduling of ingestion jobs following CQRS principles.
 * Responsibilities:
 * 1. Load source configuration using factory
 * 2. Validate source is active and healthy (domain logic in aggregate)
 * 3. Create IngestionJob aggregate
 * 4. Persist via write repository
 * 5. Publish JobScheduled
 *
 * Requirements: 1.1, 1.2
 * Design: Commands - Job Commands
 */
@CommandHandler(ScheduleJobCommand)
export class ScheduleJobCommandHandler implements ICommandHandler<
  ScheduleJobCommand,
  ScheduleJobResult
> {
  private readonly logger = new Logger(ScheduleJobCommandHandler.name);

  constructor(
    @Inject('ISourceConfigurationFactory')
    private readonly sourceFactory: ISourceConfigurationFactory,
    @Inject('IIngestionJobWriteRepository')
    private readonly jobWriteRepository: IIngestionJobWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Executes the ScheduleJobCommand
   *
   * Pipeline: load source → validate → create job → persist → publish event
   */
  async execute(command: ScheduleJobCommand): Promise<ScheduleJobResult> {
    this.logger.log(`Scheduling job for source: ${command.sourceId}`);

    // 1. Load source aggregate using factory (single load, no QueryBus)
    const sourceConfig = await this.sourceFactory.load(command.sourceId);
    if (!sourceConfig) {
      throw new Error(`Source not found: ${command.sourceId}`);
    }

    // 2. Validate source is active (domain logic in aggregate)
    if (!sourceConfig.isActive) {
      throw new Error(
        `Cannot schedule job for inactive source: ${command.sourceId}`,
      );
    }

    // 3. Validate source is healthy (domain logic in aggregate)
    if (!sourceConfig.isHealthy()) {
      throw new Error(
        `Cannot schedule job for unhealthy source: ${command.sourceId} ` +
          `(${sourceConfig.consecutiveFailures} consecutive failures, ` +
          `${sourceConfig.successRate.toFixed(1)}% success rate)`,
      );
    }

    // 4. Create IngestionJob aggregate
    const jobId = randomUUID();
    const scheduledAt = command.scheduledAt || new Date();

    const job = IngestionJob.create(jobId, sourceConfig, scheduledAt);

    this.logger.log(
      `Created job ${jobId} for source ${command.sourceId}, scheduled at ${scheduledAt.toISOString()}`,
    );

    // 5. Persist via write repository
    await this.jobWriteRepository.save(job);

    this.logger.log(`Persisted job ${jobId}`);

    // 6. Publish JobScheduled
    const event = new JobScheduled(jobId, command.sourceId, scheduledAt);
    await this.eventBus.publish(event);

    this.logger.log(`Published JobScheduled for job ${jobId}`);

    return {
      jobId,
      scheduledAt,
    };
  }
}
