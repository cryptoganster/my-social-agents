import { SourceConfigurationReadModel } from '@/ingestion/source/domain/read-models/source-configuration';
import { GetSourceByIdResult } from '@/ingestion/source/app/queries/get-source-by-id/query';

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
   * Find source by ID (for factory reconstitution)
   * @param sourceId - Source identifier
   * @returns Source read model or null if not found
   */
  findById(sourceId: string): Promise<SourceConfigurationReadModel | null>;

  /**
   * Find source by ID with health metrics (for queries)
   * @param sourceId - Source identifier
   * @returns Source read model with health metrics or null if not found
   */
  findByIdWithHealth(sourceId: string): Promise<GetSourceByIdResult | null>;

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

  /**
   * Find unhealthy sources based on failure threshold
   * @param threshold - Minimum consecutive failures to be considered unhealthy
   * @returns Array of unhealthy source read models with health metrics
   */
  findUnhealthy(threshold: number): Promise<GetSourceByIdResult[]>;
}
