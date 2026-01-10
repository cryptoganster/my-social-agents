import { SourceReadModel } from '../../read-models/source-read-model';

/**
 * Read repository interface for Source queries
 * Used by Job and Content sub-contexts to query source information
 * without coupling to Source sub-context
 */
export interface ISourceReadRepository {
  /**
   * Find source by ID
   * @param sourceId - Source identifier
   * @returns Source read model or null if not found
   */
  findById(sourceId: string): Promise<SourceReadModel | null>;

  /**
   * Find all sources of a specific type
   * @param sourceType - Type of source (e.g., 'WEB_SCRAPER', 'RSS_FEED')
   * @returns Array of source read models
   */
  findByType(sourceType: string): Promise<SourceReadModel[]>;

  /**
   * Find all active sources
   * @returns Array of active source read models
   */
  findActive(): Promise<SourceReadModel[]>;
}
