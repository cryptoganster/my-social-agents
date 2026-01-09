import {
  CommandHandler,
  ICommandHandler,
  QueryBus,
  EventBus,
} from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { JobScheduledEvent } from '@/ingestion/job/domain/events/job-scheduled';
import {
  GetSourceByIdQuery,
  GetSourceByIdResult,
} from '@/ingestion/source/app/queries/get-source-by-id/query';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { ScheduleJobCommand } from './command';
import { ScheduleJobResult } from './result';

/**
 * ScheduleJobCommandHandler
 *
 * Handles the scheduling of ingestion jobs following CQRS principles.
 * Responsibilities:
 * 1. Load source configuration using GetSourceByIdQuery
 * 2. Validate source is active and healthy
 * 3. Create IngestionJob aggregate
 * 4. Persist via write repository
 * 5. Publish JobScheduledEvent
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
    private readonly queryBus: QueryBus,
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

    // 1. Load source configuration using query
    const sourceResult = await this.queryBus.execute<
      GetSourceByIdQuery,
      GetSourceByIdResult | null
    >(new GetSourceByIdQuery(command.sourceId));

    if (!sourceResult) {
      throw new Error(`Source not found: ${command.sourceId}`);
    }

    // 2. Validate source is active
    if (!sourceResult.isActive) {
      throw new Error(
        `Cannot schedule job for inactive source: ${command.sourceId}`,
      );
    }

    // 3. Validate source is healthy
    const healthMetrics = sourceResult.healthMetrics;

    // A source is considered unhealthy if:
    // - It has 3 or more consecutive failures, OR
    // - It has a success rate below 50% AND has executed at least 5 jobs
    // This allows new sources (with no job history) to be scheduled
    const hasJobHistory =
      healthMetrics.lastSuccessAt !== null ||
      healthMetrics.lastFailureAt !== null;
    const isUnhealthy =
      healthMetrics.consecutiveFailures >= 3 ||
      (hasJobHistory && healthMetrics.successRate < 50);

    if (isUnhealthy) {
      throw new Error(
        `Cannot schedule job for unhealthy source: ${command.sourceId} ` +
          `(${healthMetrics.consecutiveFailures} consecutive failures, ` +
          `${healthMetrics.successRate.toFixed(1)}% success rate)`,
      );
    }

    // 4. Load source aggregate for job creation
    const sourceConfig = await this.sourceFactory.load(command.sourceId);
    if (!sourceConfig) {
      throw new Error(`Source configuration not found: ${command.sourceId}`);
    }

    // 5. Create IngestionJob aggregate
    const jobId = randomUUID();
    const scheduledAt = command.scheduledAt || new Date();

    const job = IngestionJob.create(jobId, sourceConfig, scheduledAt);

    this.logger.log(
      `Created job ${jobId} for source ${command.sourceId}, scheduled at ${scheduledAt.toISOString()}`,
    );

    // 6. Persist via write repository
    await this.jobWriteRepository.save(job);

    this.logger.log(`Persisted job ${jobId}`);

    // 7. Publish JobScheduledEvent
    const event = new JobScheduledEvent(jobId, command.sourceId, scheduledAt);
    await this.eventBus.publish(event);

    this.logger.log(`Published JobScheduledEvent for job ${jobId}`);

    return {
      jobId,
      scheduledAt,
    };
  }
}
