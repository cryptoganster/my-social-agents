import { ContentItemReadModel } from '../../read-models/content-item-read-model';

/**
 * Read repository interface for ContentItem queries
 * Used by Refinement context to query content information
 * without coupling to Content sub-context
 */
export interface IContentItemReadRepository {
  /**
   * Find content item by ID
   * @param contentId - Content item identifier
   * @returns Content item read model or null if not found
   */
  findById(contentId: string): Promise<ContentItemReadModel | null>;

  /**
   * Find content item by hash
   * @param contentHash - Content hash (SHA-256)
   * @returns Content item read model or null if not found
   */
  findByHash(contentHash: string): Promise<ContentItemReadModel | null>;

  /**
   * Find all content items from a specific source
   * @param sourceId - Source identifier
   * @returns Array of content item read models
   */
  findBySourceId(sourceId: string): Promise<ContentItemReadModel[]>;
}
