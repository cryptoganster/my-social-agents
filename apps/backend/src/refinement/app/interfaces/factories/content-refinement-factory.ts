import { ContentRefinement } from '@refinement/domain/aggregates/content-refinement';

/**
 * IContentRefinementFactory Interface
 *
 * Factory for loading ContentRefinement aggregates from persistence.
 * Used by command handlers to reconstitute aggregates for modification.
 *
 * Lives in Application layer because:
 * - Used for loading from persistence (infrastructure concern)
 * - Called by Command handlers (Application layer)
 * - Not a pure domain concept
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Factory Interfaces
 */
export interface IContentRefinementFactory {
  /**
   * Loads a ContentRefinement aggregate by ID
   *
   * @param refinementId - ID of the refinement
   * @returns ContentRefinement aggregate or null if not found
   */
  load(refinementId: string): Promise<ContentRefinement | null>;
}
