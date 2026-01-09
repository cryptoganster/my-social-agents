import { ContentRefinement } from '@refinement/domain/aggregates/content-refinement';

/**
 * IContentRefinementFactory Interface
 *
 * Defines the contract for loading and reconstituting ContentRefinement aggregates.
 * Factories use read repositories internally to fetch data and reconstitute
 * aggregates with full behavior.
 *
 * Requirements: Refinement 1, 2
 * Design: Interfaces section - Factory Interfaces
 */
export interface IContentRefinementFactory {
  /**
   * Loads a ContentRefinement aggregate by ID
   *
   * Uses read repository to fetch data, then reconstitutes the aggregate
   * with all its chunks and full behavior.
   *
   * @param id - Refinement ID
   * @returns Reconstituted aggregate or null if not found
   */
  load(id: string): Promise<ContentRefinement | null>;

  /**
   * Loads a ContentRefinement aggregate by content item ID
   *
   * @param contentItemId - Content item ID
   * @returns Reconstituted aggregate or null if not found
   */
  loadByContentItemId(contentItemId: string): Promise<ContentRefinement | null>;
}
