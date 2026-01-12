import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';
import { IIngestionJobReadRepository } from '@/ingestion/job/app/queries/repositories/ingestion-job-read';
import { IngestionJobEntity } from '../entities/ingestion-job';

/**
 * TypeORM IngestionJobReadRepository Implementation
 *
 * Implements read operations for querying ingestion jobs using TypeORM and PostgreSQL.
 * Returns ReadModel types (plain objects) optimized for queries.
 *
 * Note: Repositories return generic ReadModels that can be used by multiple queries.
 * Query handlers then map these to query-specific Response types if needed.
 *
 * Requirements: 4.2, 4.3
 */
@Injectable()
export class TypeOrmIngestionJobReadRepository implements IIngestionJobReadRepository {
  constructor(
    @InjectRepository(IngestionJobEntity)
    private readonly repository: Repository<IngestionJobEntity>,
  ) {}

  async findById(jobId: string): Promise<IngestionJobReadModel | null> {
    const entity = await this.repository.findOne({ where: { jobId } });
    return entity ? this.toReadModel(entity) : null;
  }

  async findByStatus(
    status: string,
    limit?: number,
    offset?: number,
  ): Promise<IngestionJobReadModel[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('job')
      .where('job.status = :status', { status })
      .orderBy('job.scheduledAt', 'DESC');

    if (limit !== undefined) {
      queryBuilder.take(limit);
    }

    if (offset !== undefined) {
      queryBuilder.skip(offset);
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toReadModel(e));
  }

  async countByStatus(status: string): Promise<number> {
    return await this.repository.count({ where: { status } });
  }

  async findBySourceId(
    sourceId: string,
    limit?: number,
  ): Promise<IngestionJobReadModel[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('job')
      .where('job.sourceId = :sourceId', { sourceId })
      .orderBy('job.executedAt', 'DESC');

    if (limit !== undefined) {
      queryBuilder.take(limit);
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toReadModel(e));
  }

  async findScheduledJobs(before: Date): Promise<IngestionJobReadModel[]> {
    const entities = await this.repository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: 'PENDING' })
      .andWhere('job.scheduledAt <= :before', { before })
      .getMany();

    return entities.map((e) => this.toReadModel(e));
  }

  private toReadModel(entity: IngestionJobEntity): IngestionJobReadModel {
    return {
      jobId: entity.jobId,
      sourceId: entity.sourceId,
      status: entity.status,
      scheduledAt: entity.scheduledAt,
      executedAt: entity.executedAt,
      completedAt: entity.completedAt,
      itemsCollected: entity.itemsCollected,
      duplicatesDetected: entity.duplicatesDetected,
      errorsEncountered: entity.errorsEncountered,
      // Convert bigint to number (TypeORM returns bigint as string)
      bytesProcessed:
        typeof entity.bytesProcessed === 'string'
          ? parseInt(entity.bytesProcessed, 10)
          : entity.bytesProcessed,
      durationMs: entity.durationMs,
      errors: entity.errors,
      sourceConfig: entity.sourceConfig,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
