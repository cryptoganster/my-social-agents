/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJob, IngestionJobWriteRepository } from '@/ingestion/domain';
import { ConcurrencyException } from '@/shared/kernel';
import { IngestionJobEntity } from '../entities/ingestion-job';

/**
 * TypeORM IngestionJobWriteRepository Implementation
 *
 * Implements write operations for IngestionJob aggregate using TypeORM and PostgreSQL.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 4.1
 */
@Injectable()
export class TypeOrmIngestionJobWriteRepository implements IngestionJobWriteRepository {
  constructor(
    @InjectRepository(IngestionJobEntity)
    private readonly repository: Repository<IngestionJobEntity>,
  ) {}

  async save(job: IngestionJob): Promise<void> {
    const jobData = job.toObject();
    const entity = this.toEntity(jobData);

    // Check if this is a new aggregate (version = 0)
    if (jobData.version === 0) {
      // Insert new record
      await this.repository.insert(entity as any);
      return;
    }

    // Update existing record with optimistic locking
    const result = await this.repository
      .createQueryBuilder()
      .update(IngestionJobEntity)
      .set({
        sourceId: entity.sourceId,
        status: entity.status,
        scheduledAt: entity.scheduledAt,
        executedAt: entity.executedAt,
        completedAt: entity.completedAt,
        itemsCollected: entity.itemsCollected,
        duplicatesDetected: entity.duplicatesDetected,
        errorsEncountered: entity.errorsEncountered,
        bytesProcessed: entity.bytesProcessed,
        durationMs: entity.durationMs,
        errors: entity.errors,
        sourceConfig: entity.sourceConfig as any,
        version: jobData.version,
        updatedAt: new Date(),
      })
      .where('jobId = :id', { id: jobData.jobId })
      .andWhere('version = :oldVersion', { oldVersion: jobData.version - 1 })
      .execute();

    // If no rows were affected, version mismatch occurred
    if (result.affected === 0) {
      throw new ConcurrencyException(
        `Job ${jobData.jobId} was modified by another transaction. ` +
          `Expected version ${jobData.version - 1}, but it may have changed.`,
      );
    }
  }

  private toEntity(jobData: any): IngestionJobEntity {
    const entity = new IngestionJobEntity();
    entity.jobId = jobData.jobId;
    entity.sourceId = jobData.sourceConfig.sourceId;
    entity.status = jobData.status.toString();
    entity.scheduledAt = jobData.scheduledAt;
    entity.executedAt = jobData.executedAt;
    entity.completedAt = jobData.completedAt;
    entity.itemsCollected = jobData.metrics.itemsCollected;
    entity.duplicatesDetected = jobData.metrics.duplicatesDetected;
    entity.errorsEncountered = jobData.metrics.errorsEncountered;
    entity.bytesProcessed = jobData.metrics.bytesProcessed;
    entity.durationMs = jobData.metrics.durationMs;
    entity.errors = jobData.errors.map((e: any) => ({
      errorId: e.errorId,
      timestamp: e.timestamp,
      errorType: e.errorType.toString(),
      message: e.message,
      stackTrace: e.stackTrace,
      retryCount: e.retryCount,
    }));
    entity.sourceConfig = {
      sourceId: jobData.sourceConfig.sourceId,
      sourceType: jobData.sourceConfig.sourceType.toString(),
      name: jobData.sourceConfig.name,
      config: jobData.sourceConfig.config,
      credentials: jobData.sourceConfig.credentials,
      isActive: jobData.sourceConfig.isActive,
      createdAt: jobData.sourceConfig.createdAt,
      updatedAt: jobData.sourceConfig.updatedAt,
    };
    entity.version = jobData.version;
    return entity;
  }
}
