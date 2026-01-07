import { ContentItem } from '../../aggregates/content-item';

/**
 * IContentItemWriteRepository Interface
 *
 * Write-side persistence interface for ContentItem aggregate.
 * Following CQRS principles, this repository only handles write operations.
 * Read operations are handled by read repositories in the infrastructure layer.
 *
 * Requirements: 10.1
 */
export interface IContentItemWriteRepository {
  /**
   * Persists or updates a ContentItem aggregate
   * Uses optimistic locking to prevent concurrent modifications
   * Throws ConcurrencyException if version mismatch occurs
   */
  save(item: ContentItem): Promise<void>;
}
