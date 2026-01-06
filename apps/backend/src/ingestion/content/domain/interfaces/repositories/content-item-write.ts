import { ContentItem } from '../../aggregates/content-item';

/**
 * ContentItemWriteRepository Interface
 *
 * Write-side persistence interface for ContentItem aggregate.
 * Following CQRS principles, this repository only handles write operations.
 * Read operations are handled by read repositories in the infrastructure layer.
 *
 * Requirements: 10.1
 */
export interface ContentItemWriteRepository {
  /**
   * Persists or updates a ContentItem aggregate
   * Uses optimistic locking to prevent concurrent modifications
   * Throws ConcurrencyException if version mismatch occurs
   */
  save(item: ContentItem): Promise<void>;
}
