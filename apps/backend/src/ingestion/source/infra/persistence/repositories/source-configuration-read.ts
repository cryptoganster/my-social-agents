import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceConfigurationReadModel } from '@/ingestion/source/app/queries/read-models/source-configuration';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/app/queries/repositories/source-configuration-read';
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
export class TypeOrmSourceConfigurationReadRepository implements ISourceConfigurationReadRepository {
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

  async findByIdWithHealth(
    sourceId: string,
  ): Promise<SourceConfigurationReadModel | null> {
    const entity = await this.repository.findOne({ where: { sourceId } });
    if (!entity) {
      return null;
    }

    // Return ReadModel with flat structure (handler will map to Response)
    return this.toReadModel(entity);
  }

  async findActive(): Promise<SourceConfigurationReadModel[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toReadModel(e));
  }

  async findByType(type: string): Promise<SourceConfigurationReadModel[]> {
    const entities = await this.repository.find({
      where: { sourceType: type },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toReadModel(e));
  }

  async findUnhealthy(
    threshold: number,
  ): Promise<SourceConfigurationReadModel[]> {
    // Get all sources with consecutive failures >= threshold
    const sources = await this.repository.find({
      where: {
        consecutiveFailures: threshold,
      },
    });

    // Map to SourceConfigurationReadModel (flat structure)
    return sources.map((source) => this.toReadModel(source));
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
      consecutiveFailures: entity.consecutiveFailures,
      successRate: entity.successRate,
      totalJobs: entity.totalJobs || 0, // Default to 0 for backward compatibility
      lastSuccessAt: entity.lastSuccessAt,
      lastFailureAt: entity.lastFailureAt,
    };
  }
}
