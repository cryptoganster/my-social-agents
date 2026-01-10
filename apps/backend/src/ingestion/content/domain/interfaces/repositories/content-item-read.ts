import { ContentItemReadModel } from '@/ingestion/content/app/queries/read-models/content-item';
import { ContentHash } from '../../value-objects/content-hash';

/**
 * IContentItemReadRepository Interface
 *
 * Read-side persistence interface for querying ContentItem data.
 * Following CQRS principles, this repository only handles read operations.
 * Returns read models (plain objects) optimized for queries.
 *
 * Requirements: 3.2
 */
export interface IContentItemReadRepository {
  /**
   * Finds a content item by its unique identifier
   */
  findById(contentId: string): Promise<ContentItemReadModel | null>;

  /**
   * Finds a content item by its content hash
   * Used for duplicate detection
   */
  findByHash(hash: ContentHash): Promise<ContentItemReadModel | null>;

  /**
   * Finds content items by source ID
   * Returns most recent items first
   */
  findBySource(
    sourceId: string,
    limit: number,
  ): Promise<ContentItemReadModel[]>;
}
