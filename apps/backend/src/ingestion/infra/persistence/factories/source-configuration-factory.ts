import { Injectable } from '@nestjs/common';
import {
  SourceConfiguration,
  SourceConfigurationFactory,
  SourceType,
} from '@/ingestion/domain';
import { TypeOrmSourceConfigurationReadRepository } from '../repositories/source-configuration-read';

/**
 * TypeORM SourceConfigurationFactory Implementation
 *
 * Factory for reconstituting SourceConfiguration aggregates from persistence.
 * Uses TypeORM read repository to load data and reconstructs aggregates with full behavior.
 *
 * Requirements: 5.1
 */
@Injectable()
export class TypeOrmSourceConfigurationFactory implements SourceConfigurationFactory {
  constructor(
    private readonly readRepo: TypeOrmSourceConfigurationReadRepository,
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
