import { ChunkHash } from '@refinement/domain/value-objects/chunk-hash';

/**
 * IDuplicateDetector Interface
 *
 * Defines the contract for duplicate chunk detection.
 * Used to check if a chunk with a given hash already exists.
 *
 * Requirements: Refinement 8
 * Design: Domain Services section - DuplicateDetector
 */
export interface IDuplicateDetector {
  /**
   * Checks if a chunk with the given hash already exists in the refinement
   *
   * @param refinementId - ID of the refinement to check
   * @param hash - Hash of the chunk to check
   * @returns true if duplicate exists, false otherwise
   */
  isDuplicate(refinementId: string, hash: ChunkHash): Promise<boolean>;
}

/**
 * DuplicateDetector Domain Service
 *
 * Detects duplicate chunks within a refinement using hash-based lookup.
 * This service accesses chunks through the ContentRefinement aggregate,
 * following the DDD principle that repositories are ONLY for Aggregates.
 *
 * Requirements: Refinement 8
 * Design: Domain Services section - DuplicateDetector
 */
export class DuplicateDetector implements IDuplicateDetector {
  /**
   * Note: This service will be injected with IContentRefinementFactory
   * in the infrastructure layer to load the aggregate and check for duplicates.
   *
   * The factory pattern is used here because we need to load the aggregate
   * to access its chunks, following DDD principles.
   */

  /**
   * Checks if a chunk with the given hash already exists
   *
   * Implementation note: This method signature is defined here in the domain,
   * but the actual implementation will be in the infrastructure layer where
   * it can access the ContentRefinementFactory to load the aggregate.
   *
   * @param _refinementId - ID of the refinement to check (unused in domain, for infrastructure)
   * @param _hash - Hash of the chunk to check (unused in domain, for infrastructure)
   * @returns true if duplicate exists, false otherwise
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isDuplicate(_refinementId: string, _hash: ChunkHash): Promise<boolean> {
    // This is a placeholder implementation
    // The actual implementation will be in the infrastructure layer
    // where it can inject and use IContentRefinementFactory
    throw new Error(
      'DuplicateDetector must be implemented in infrastructure layer with factory injection',
    );
  }
}
