import { SourceConfigurationReadModel } from '../read-models/source-configuration';

/**
 * Read Repository Interface for Source Configurations
 *
 * Lives in Application layer because:
 * - Returns ReadModels (application concern, not domain)
 * - Used by Query handlers (application layer)
 * - Part of CQRS read side (not domain logic)
 *
 * Note: Repositories return generic ReadModels that can be used by multiple queries.
 * Query handlers then map these to query-specific Response types.
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
  findByIdWithHealth(
    sourceId: string,
  ): Promise<SourceConfigurationReadModel | null>;

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
  findUnhealthy(threshold: number): Promise<SourceConfigurationReadModel[]>;
}
