import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';
import { SourceConfigurationEntity } from '../entities/source-configuration';

/**
 * TypeORM SourceConfigurationReadRepository Implementation
 *
 * Implements read operations for querying source configurations using TypeORM and PostgreSQL.
 * Returns read models (plain objects) optimized for queries.
 *
 * Requirements: 5.2
 */
@Injectable()
export class TypeOrmSourceConfigurationReadRepository {
  constructor(
    @InjectRepository(SourceConfigurationEntity)
    private readonly repository: Repository<SourceConfigurationEntity>,
  ) {}

  async findById(
    sourceId: string,
  ): Promise<SourceConfigurationReadModel | null> {
    const entity = await this.repository.findOne({ where: { sourceId } });
    return entity ? this.toReadModel(entity) : null;
  }

  async findActive(): Promise<SourceConfigurationReadModel[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toReadModel(e));
  }

  private toReadModel(
    entity: SourceConfigurationEntity,
  ): SourceConfigurationReadModel {
    return {
      sourceId: entity.sourceId,
      sourceType: entity.sourceType,
      name: entity.name,
      config: entity.config,
      credentials: entity.credentials,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    };
  }
}
