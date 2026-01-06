import { Injectable } from '@nestjs/common';
import {
  IngestionJob,
  IngestionJobFactory,
  IngestionStatus,
  JobMetrics,
} from '@/ingestion/domain';
import { SourceConfiguration } from '@/ingestion/domain/aggregates/source-configuration';
import { SourceType } from '@/ingestion/domain/value-objects/source-type';
import {
  ErrorRecord,
  ErrorType,
} from '@/ingestion/shared/entities/error-record';
import { TypeOrmIngestionJobReadRepository } from '../repositories/ingestion-job-read';

/**
 * TypeORM IngestionJobFactory Implementation
 *
 * Factory for reconstituting IngestionJob aggregates from persistence.
 * Uses TypeORM read repository to load data and reconstructs aggregates with full behavior.
 *
 * Requirements: 4.1
 */
@Injectable()
export class TypeOrmIngestionJobFactory implements IngestionJobFactory {
  constructor(private readonly readRepo: TypeOrmIngestionJobReadRepository) {}

  async load(jobId: string): Promise<IngestionJob | null> {
    // Load data from read repository
    const data = await this.readRepo.findById(jobId);
    if (data === null) return null;

    // Reconstitute source configuration from stored data
    const sourceConfig = SourceConfiguration.reconstitute({
      sourceId: data.sourceConfig.sourceId,
      sourceType: SourceType.fromString(data.sourceConfig.sourceType),
      name: data.sourceConfig.name,
      config: data.sourceConfig.config,
      credentials: data.sourceConfig.credentials,
      isActive: data.sourceConfig.isActive,
      createdAt: data.sourceConfig.createdAt,
      updatedAt: data.sourceConfig.updatedAt,
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
