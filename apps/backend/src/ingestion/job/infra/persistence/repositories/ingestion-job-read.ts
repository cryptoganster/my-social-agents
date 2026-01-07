import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';
import { IIngestionJobReadRepository } from '@/ingestion/job/domain/interfaces/repositories/ingestion-job-read';
import { IngestionJobEntity } from '../entities/ingestion-job';

/**
 * TypeORM IngestionJobReadRepository Implementation
 *
 * Implements read operations for querying ingestion jobs using TypeORM and PostgreSQL.
 * Returns read models (plain objects) optimized for queries.
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

  async findByStatus(status: string): Promise<IngestionJobReadModel[]> {
    const entities = await this.repository.find({ where: { status } });
    return entities.map((e) => this.toReadModel(e));
  }

  async findBySourceId(sourceId: string): Promise<IngestionJobReadModel[]> {
    const entities = await this.repository.find({
      where: { sourceId },
      order: { scheduledAt: 'DESC' },
    });
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
      bytesProcessed: entity.bytesProcessed,
      durationMs: entity.durationMs,
      errors: entity.errors,
      sourceConfig: entity.sourceConfig,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
