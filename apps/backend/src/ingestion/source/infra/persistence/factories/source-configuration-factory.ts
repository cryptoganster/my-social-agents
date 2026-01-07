import { Injectable, Inject } from '@nestjs/common';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { ISourceConfigurationFactory } from '@/ingestion/source/domain/interfaces/factories/source-configuration-factory';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';
import { ISourceConfigurationReadRepository } from '@/ingestion/source/domain/interfaces/repositories/source-configuration-read';

/**
 * TypeORM SourceConfigurationFactory Implementation
 *
 * Factory for reconstituting SourceConfiguration aggregates from persistence.
 * Uses read repository interface to load data and reconstructs aggregates with full behavior.
 *
 * Follows Dependency Inversion Principle:
 * - Depends on domain interface (ISourceConfigurationReadRepository)
 * - Not on concrete implementation (TypeOrmSourceConfigurationReadRepository)
 *
 * Requirements: 5.1
 */
@Injectable()
export class TypeOrmSourceConfigurationFactory implements ISourceConfigurationFactory {
  constructor(
    @Inject('ISourceConfigurationReadRepository')
    private readonly readRepo: ISourceConfigurationReadRepository,
  ) {}

  async load(sourceId: string): Promise<SourceConfiguration | null> {
    // Load data from read repository
    const data = await this.readRepo.findById(sourceId);
    if (!data) return null;

    // Reconstitute value objects
    const sourceType = SourceType.fromString(data.sourceType);

    // Reconstitute aggregate with version from database
    return SourceConfiguration.reconstitute({
      sourceId: data.sourceId,
      sourceType,
      name: data.name,
      config: data.config,
      credentials: data.credentials,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      version: data.version,
    });
  }
}
