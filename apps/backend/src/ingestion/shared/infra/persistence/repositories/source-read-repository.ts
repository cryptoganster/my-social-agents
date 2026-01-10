import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISourceReadRepository } from '@/ingestion/shared/domain/interfaces/repositories/source-read-repository';
import { SourceReadModel } from '@/ingestion/shared/domain/read-models/source-read-model';
import { SourceReadModelEntity } from '../entities/source-read-model.entity';

/**
 * TypeORM implementation of ISourceReadRepository
 * Provides optimized read operations for source queries
 */
@Injectable()
export class TypeOrmSourceReadRepository implements ISourceReadRepository {
  constructor(
    @InjectRepository(SourceReadModelEntity)
    private readonly repository: Repository<SourceReadModelEntity>,
  ) {}

  async findById(sourceId: string): Promise<SourceReadModel | null> {
    const entity = await this.repository.findOne({
      where: { sourceId },
    });

    if (!entity) {
      return null;
    }

    return this.toDomainModel(entity);
  }

  async findByType(sourceType: string): Promise<SourceReadModel[]> {
    const entities = await this.repository.find({
      where: { sourceType },
      order: { name: 'ASC' },
    });

    return entities.map((entity) => this.toDomainModel(entity));
  }

  async findActive(): Promise<SourceReadModel[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return entities.map((entity) => this.toDomainModel(entity));
  }

  /**
   * Convert TypeORM entity to domain read model
   */
  private toDomainModel(entity: SourceReadModelEntity): SourceReadModel {
    return {
      sourceId: entity.sourceId,
      sourceType: entity.sourceType,
      name: entity.name,
      isActive: entity.isActive,
      healthMetrics: {
        consecutiveFailures: entity.consecutiveFailures,
        successRate: parseFloat(entity.successRate.toString()),
        lastSuccessAt: entity.lastSuccessAt,
        lastFailureAt: entity.lastFailureAt,
      },
      configSummary: entity.configSummary,
      updatedAt: entity.updatedAt,
    };
  }
}
