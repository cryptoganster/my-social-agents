import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { IngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { IJobScheduler } from '@/shared/kernel';
import { ScheduleIngestionJobCommand } from './command';
import { ScheduleIngestionJobResult } from './result';

/**
 * ScheduleIngestionJobCommandHandler
 *
 * Handles the scheduling of ingestion jobs following CQRS principles.
 * Responsibilities:
 * 1. Load and validate source configuration
 * 2. Create new IngestionJob aggregate
 * 3. Persist the job
 * 4. Schedule execution (immediate or future)
 *
 * Requirements: 4.1, 4.2
 */
@CommandHandler(ScheduleIngestionJobCommand)
export class ScheduleIngestionJobCommandHandler implements ICommandHandler<
  ScheduleIngestionJobCommand,
  ScheduleIngestionJobResult
> {
  private readonly logger = new Logger(ScheduleIngestionJobCommandHandler.name);

  constructor(
    @Inject('SourceConfigurationFactory')
    private readonly sourceConfigFactory: SourceConfigurationFactory,
    @Inject('IngestionJobWriteRepository')
    private readonly jobWriteRepository: IngestionJobWriteRepository,
    @Inject('IJobScheduler')
    private readonly jobScheduler: IJobScheduler,
  ) {}

  /**
   * Executes the ScheduleIngestionJobCommand
   *
   * Pipeline: load config → validate → create job → persist → schedule
   */
  async execute(
    command: ScheduleIngestionJobCommand,
  ): Promise<ScheduleIngestionJobResult> {
    try {
      // 1. Load source configuration
      this.logger.log(`Loading source configuration: ${command.sourceId}`);
      const sourceConfig = await this.sourceConfigFactory.load(
        command.sourceId,
      );

      if (!sourceConfig) {
        throw new Error(`Source configuration not found: ${command.sourceId}`);
      }

      // 2. Validate source configuration
      const validation = sourceConfig.validateConfig();
      if (!validation.isValid) {
        throw new Error(
          `Invalid source configuration: ${validation.errors.join(', ')}`,
        );
      }

      if (!sourceConfig.isActive) {
        throw new Error(
          `Source configuration is inactive: ${command.sourceId}`,
        );
      }

      // 3. Create IngestionJob aggregate
      const jobId = command.jobId ?? randomUUID();
      const scheduledAt = command.scheduledAt || new Date(); // Default to immediate execution

      this.logger.log(
        `Creating ingestion job ${jobId} for source ${command.sourceId}`,
      );
      const ingestionJob = IngestionJob.create(
        jobId,
        sourceConfig,
        scheduledAt,
      );

      // 4. Persist the job
      this.logger.log(`Persisting ingestion job ${jobId}`);
      await this.jobWriteRepository.save(ingestionJob);

      // 5. Schedule execution
      // Note: The actual execution logic would be implemented in ExecuteIngestionJobUseCase
      // For now, we just register the job with the scheduler
      const isImmediate = scheduledAt.getTime() <= Date.now();

      if (isImmediate) {
        this.logger.log(`Job ${jobId} scheduled for immediate execution`);
        // For immediate execution, schedule with minimal delay (1ms)
        // This allows the current transaction to complete before execution starts
        this.jobScheduler.scheduleOnce(
          jobId,
          async (): Promise<void> => {
            this.logger.log(`Executing job ${jobId} (immediate)`);
            // TODO: Invoke ExecuteIngestionJobUseCase when implemented
            // For now, just log that the job would execute
            this.logger.warn(
              `Job ${jobId} execution placeholder - ExecuteIngestionJobUseCase not yet implemented`,
            );
            return Promise.resolve();
          },
          new Date(Date.now() + 1),
        );
      } else {
        this.logger.log(
          `Job ${jobId} scheduled for execution at ${scheduledAt.toISOString()}`,
        );
        this.jobScheduler.scheduleOnce(
          jobId,
          async (): Promise<void> => {
            this.logger.log(`Executing job ${jobId} at scheduled time`);
            // TODO: Invoke ExecuteIngestionJobUseCase when implemented
            // For now, just log that the job would execute
            this.logger.warn(
              `Job ${jobId} execution placeholder - ExecuteIngestionJobUseCase not yet implemented`,
            );
            return Promise.resolve();
          },
          scheduledAt,
        );
      }

      return {
        jobId,
        sourceId: command.sourceId,
        scheduledAt,
        isScheduled: true,
      };
    } catch (error) {
      // Fatal error: log and rethrow
      this.logger.error(
        `Fatal error scheduling ingestion job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
