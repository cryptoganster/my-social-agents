import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import { UpdateJobMetricsCommand } from './command';

/**
 * UpdateJobMetricsCommandHandler
 *
 * Handles updating job metrics in real-time as content is processed.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Update metrics on aggregate
 * 3. Persist via write repository
 *
 * Requirements: 3.1, 3.2, 3.3
 * Design: Commands - Job Commands
 */
@CommandHandler(UpdateJobMetricsCommand)
export class UpdateJobMetricsCommandHandler implements ICommandHandler<
  UpdateJobMetricsCommand,
  void
> {
  private readonly logger = new Logger(UpdateJobMetricsCommandHandler.name);

  constructor(
    @Inject('IIngestionJobFactory')
    private readonly jobFactory: IIngestionJobFactory,
    @Inject('IIngestionJobWriteRepository')
    private readonly jobWriteRepository: IIngestionJobWriteRepository,
  ) {}

  /**
   * Executes the UpdateJobMetricsCommand
   *
   * Pipeline: load job → update metrics → persist
   */
  async execute(command: UpdateJobMetricsCommand): Promise<void> {
    this.logger.log(`Updating metrics for job: ${command.jobId}`);

    // 1. Load job aggregate using factory
    const job = await this.jobFactory.load(command.jobId);

    if (!job) {
      throw new Error(`Ingestion job not found: ${command.jobId}`);
    }

    // 2. Update metrics on aggregate
    job.updateMetrics(command.metricUpdate);

    this.logger.log(
      `Updated metrics for job ${command.jobId}: ${JSON.stringify(command.metricUpdate)}`,
    );

    // 3. Persist via write repository
    await this.jobWriteRepository.save(job);

    this.logger.log(`Persisted updated metrics for job ${command.jobId}`);
  }
}
