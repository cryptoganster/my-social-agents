import { ContentRefinement } from '@refinement/domain/aggregates/content-refinement';

/**
 * IContentRefinementWriteRepository Interface
 *
 * Defines the contract for persisting ContentRefinement aggregates.
 * Write repositories handle save and delete operations only (no queries).
 *
 * Requirements: Refinement 1, 9, 10
 * Design: Interfaces section - Repository Interfaces
 */
export interface IContentRefinementWriteRepository {
  /**
   * Saves a ContentRefinement aggregate
   *
   * Uses optimistic locking to prevent concurrent modifications.
   * If version mismatch occurs, throws ConcurrencyException.
   *
   * @param refinement - The aggregate to save
   * @throws ConcurrencyException if version mismatch detected
   */
  save(refinement: ContentRefinement): Promise<void>;

  /**
   * Deletes a ContentRefinement aggregate
   *
   * @param id - ID of the aggregate to delete
   */
  delete(id: string): Promise<void>;
}
