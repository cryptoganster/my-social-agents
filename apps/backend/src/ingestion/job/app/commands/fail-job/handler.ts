import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { FailJobCommand } from './command';
import { FailJobResult } from './result';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import { IIngestionJobWriteRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-write';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/job/domain/entities/error-record';
import { JobFailed } from '@/ingestion/job/domain/events';

/**
 * FailJobCommandHandler
 *
 * Handles marking an ingestion job as failed.
 * Responsibilities:
 * 1. Load job aggregate using factory
 * 2. Create error record and fail job
 * 3. Persist via write repository
 * 4. Publish JobFailed
 *
 * Requirements: 4.4, 4.6
 */
@CommandHandler(FailJobCommand)
export class FailJobCommandHandler implements ICommandHandler<
  FailJobCommand,
  FailJobResult
> {
  private readonly logger = new Logger(FailJobCommandHandler.name);

  constructor(
    @Inject('IIngestionJobFactory')
    private readonly jobFactory: IIngestionJobFactory,
    @Inject('IIngestionJobWriteRepository')
    private readonly jobWriteRepository: IIngestionJobWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: FailJobCommand): Promise<FailJobResult> {
    this.logger.log(`Failing job: ${command.jobId}`);

    // 1. Load job aggregate using factory
    const job = await this.jobFactory.load(command.jobId);

    if (!job) {
      throw new Error(`Ingestion job not found: ${command.jobId}`);
    }

    // 2. Create error record and fail job
    const errorRecord = ErrorRecord.create({
      errorType: (command.errorType as ErrorType) ?? ErrorType.UNKNOWN_ERROR,
      message: command.errorMessage,
      stackTrace: command.stackTrace,
    });

    job.fail(errorRecord);

    // 3. Persist via write repository
    await this.jobWriteRepository.save(job);

    const failedAt = job.completedAt ?? new Date();

    // 4. Publish JobFailed
    await this.eventBus.publish(
      new JobFailed(
        job.id,
        job.sourceConfig.sourceId,
        {
          message: errorRecord.message,
          type: errorRecord.errorType,
          stack: errorRecord.stackTrace,
        },
        failedAt,
      ),
    );

    this.logger.error(`Job failed: ${command.jobId} - ${command.errorMessage}`);

    return {
      jobId: job.id,
      failedAt,
      errorMessage: command.errorMessage,
    };
  }
}
