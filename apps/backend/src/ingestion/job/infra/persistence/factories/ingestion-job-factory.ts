import { Injectable, Inject } from '@nestjs/common';
import { IngestionJob } from '@/ingestion/job/domain/aggregates/ingestion-job';
import { IIngestionJobFactory } from '@/ingestion/job/domain/interfaces/factories/ingestion-job-factory';
import {
  IngestionStatus,
  JobMetrics,
} from '@/ingestion/job/domain/value-objects';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/job/domain/entities/error-record';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';

/**
 * TypeORM IngestionJobFactory Implementation
 *
 * Factory for reconstituting IngestionJob aggregates from persistence.
 * Uses read repository interface to load data and reconstructs aggregates with full behavior.
 *
 * Follows Dependency Inversion Principle:
 * - Depends on domain interface (IIngestionJobReadRepository)
 * - Not on concrete implementation (TypeOrmIngestionJobReadRepository)
 *
 * Requirements: 4.1
 */
@Injectable()
export class TypeOrmIngestionJobFactory implements IIngestionJobFactory {
  constructor(
    @Inject('IIngestionJobReadRepository')
    private readonly readRepo: IIngestionJobReadRepository,
  ) {}

  async load(jobId: string): Promise<IngestionJob | null> {
    // Load data from read repository
    const data = await this.readRepo.findById(jobId);
    if (data === null) return null;

    // Reconstitute source configuration from stored data
    // Note: Health metrics are not included in job read model's sourceConfig
    // They are tracked separately in the source configuration aggregate
    const sourceConfig = SourceConfiguration.reconstitute({
      sourceId: data.sourceConfig.sourceId,
      sourceType: SourceType.fromString(data.sourceConfig.sourceType),
      name: data.sourceConfig.name,
      config: data.sourceConfig.config,
      credentials: data.sourceConfig.credentials,
      isActive: data.sourceConfig.isActive,
      createdAt: data.sourceConfig.createdAt,
      updatedAt: data.sourceConfig.updatedAt,
      consecutiveFailures: 0, // Default values - not stored in job read model
      successRate: 100,
      totalJobs: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      version: 0, // Source config version is separate from job version
    });

    // Reconstitute errors
    const errors = data.errors.map((e) =>
      ErrorRecord.reconstitute({
        errorId: e.errorId,
        timestamp: e.timestamp,
        errorType: e.errorType as ErrorType,
        message: e.message,
        stackTrace: e.stackTrace ?? undefined,
        retryCount: e.retryCount,
      }),
    );

    // Reconstitute metrics
    const metrics = JobMetrics.create({
      itemsCollected: data.itemsCollected,
      duplicatesDetected: data.duplicatesDetected,
      errorsEncountered: data.errorsEncountered,
      bytesProcessed: data.bytesProcessed,
      durationMs: data.durationMs,
    });

    // Reconstitute aggregate with version from database
    return IngestionJob.reconstitute({
      jobId: data.jobId,
      sourceConfig,
      status: IngestionStatus.fromString(data.status),
      scheduledAt: data.scheduledAt,
      executedAt: data.executedAt,
      completedAt: data.completedAt,
      metrics,
      errors,
      version: data.version,
    });
  }
}
