import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';

/**
 * Read Repository Interface for Source Configurations
 *
 * Provides query operations for source configurations.
 * Follows CQRS pattern - read operations only, no save/delete.
 *
 * Requirements: All
 */
export interface ISourceConfigurationReadRepository {
  /**
   * Find source by ID
   * @param sourceId - Source identifier
   * @returns Source read model or null if not found
   */
  findById(sourceId: string): Promise<SourceConfigurationReadModel | null>;

  /**
   * Find all active sources
   * @returns Array of active source read models
   */
  findActive(): Promise<SourceConfigurationReadModel[]>;

  /**
   * Find sources by type
   * @param type - Source type to filter by
   * @returns Array of source read models
   */
  findByType(type: string): Promise<SourceConfigurationReadModel[]>;
}
