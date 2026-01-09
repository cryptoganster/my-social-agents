import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';
import { SourceConfigurationEntity } from '../entities/source-configuration';
import { GetSourceByIdResult } from '@/ingestion/source/app/queries/get-source-by-id/query';

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
  ): Promise<GetSourceByIdResult | null> {
    const entity = await this.repository.findOne({ where: { sourceId } });
    if (!entity) {
      return null;
    }

    // Return health metrics directly from the entity (stored in aggregate)
    return {
      sourceId: entity.sourceId,
      name: entity.name,
      sourceType: entity.sourceType,
      isActive: entity.isActive,
      config: entity.config,
      healthMetrics: {
        successRate: entity.successRate,
        consecutiveFailures: entity.consecutiveFailures,
        totalJobs: entity.totalJobs,
        lastSuccessAt: entity.lastSuccessAt,
        lastFailureAt: entity.lastFailureAt,
      },
    };
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

  async findUnhealthy(threshold: number): Promise<GetSourceByIdResult[]> {
    // Get all sources with consecutive failures >= threshold
    const sources = await this.repository.find({
      where: {
        consecutiveFailures: threshold,
      },
    });

    // Map to GetSourceByIdResult
    return sources.map((source) => ({
      sourceId: source.sourceId,
      name: source.name,
      sourceType: source.sourceType,
      isActive: source.isActive,
      config: source.config,
      healthMetrics: {
        successRate: source.successRate,
        consecutiveFailures: source.consecutiveFailures,
        totalJobs: source.totalJobs,
        lastSuccessAt: source.lastSuccessAt,
        lastFailureAt: source.lastFailureAt,
      },
    }));
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
