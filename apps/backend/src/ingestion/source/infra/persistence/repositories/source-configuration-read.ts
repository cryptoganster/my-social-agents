import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';
import { SourceConfigurationEntity } from '../entities/source-configuration';
import { GetSourceByIdResult } from '@/ingestion/source/app/queries/get-source-by-id/query';
import { IngestionJobEntity } from '@/ingestion/job/infra/persistence/entities/ingestion-job';

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
    @InjectRepository(IngestionJobEntity)
    private readonly jobRepository: Repository<IngestionJobEntity>,
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

    // Calculate health metrics from job history
    const healthMetrics = await this.calculateHealthMetrics(sourceId);

    return {
      sourceId: entity.sourceId,
      name: entity.name,
      sourceType: entity.sourceType,
      isActive: entity.isActive,
      config: entity.config,
      healthMetrics,
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
    // Get all sources
    const sources = await this.repository.find();

    // Calculate health metrics for each and filter unhealthy ones
    const sourcesWithHealth = await Promise.all(
      sources.map(async (source) => {
        const healthMetrics = await this.calculateHealthMetrics(
          source.sourceId,
        );
        return {
          sourceId: source.sourceId,
          name: source.name,
          sourceType: source.sourceType,
          isActive: source.isActive,
          config: source.config,
          healthMetrics,
        };
      }),
    );

    // Filter sources that exceed the failure threshold
    return sourcesWithHealth.filter(
      (source) => source.healthMetrics.consecutiveFailures >= threshold,
    );
  }

  /**
   * Calculate health metrics from job history
   * @param sourceId - Source identifier
   * @returns Health metrics including success rate and failure tracking
   */
  private async calculateHealthMetrics(sourceId: string): Promise<{
    successRate: number;
    consecutiveFailures: number;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
  }> {
    // Get recent jobs for this source (last 100)
    const jobs = await this.jobRepository.find({
      where: { sourceId },
      order: { executedAt: 'DESC' },
      take: 100,
    });

    if (jobs.length === 0) {
      return {
        successRate: 0,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
      };
    }

    // Calculate success rate
    const completedJobs = jobs.filter((job) => job.status === 'COMPLETED');
    const successRate =
      jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0;

    // Calculate consecutive failures (from most recent jobs)
    let consecutiveFailures = 0;
    for (const job of jobs) {
      if (job.status === 'FAILED') {
        consecutiveFailures++;
      } else if (job.status === 'COMPLETED') {
        break; // Stop counting when we hit a success
      }
    }

    // Find last success and failure dates
    const lastSuccess = completedJobs.find((job) => job.completedAt !== null);
    const lastFailure = jobs.find((job) => job.status === 'FAILED');

    return {
      successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
      consecutiveFailures,
      lastSuccessAt: lastSuccess?.completedAt || null,
      lastFailureAt: lastFailure?.executedAt || null,
    };
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
