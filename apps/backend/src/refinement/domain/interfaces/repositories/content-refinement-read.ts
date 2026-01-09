import { ContentRefinementReadModel } from '@refinement/domain/read-models/content-refinement';
import { ChunkReadModel } from '@refinement/domain/read-models/chunk';

/**
 * IContentRefinementReadRepository Interface
 *
 * Defines the contract for querying ContentRefinement data.
 * Read repositories return read models (plain objects), not aggregates.
 *
 * Note: Chunks are accessed through the ContentRefinement aggregate.
 * We provide specialized query methods for chunk data rather than
 * creating a separate ChunkReadRepository (following DDD principles).
 *
 * Requirements: Refinement 1, 2, 9
 * Design: Interfaces section - Repository Interfaces
 */
export interface IContentRefinementReadRepository {
  /**
   * Finds a refinement by ID
   *
   * @param id - Refinement ID
   * @returns Read model or null if not found
   */
  findById(id: string): Promise<ContentRefinementReadModel | null>;

  /**
   * Finds a refinement by content item ID
   *
   * @param contentItemId - Content item ID
   * @returns Read model or null if not found
   */
  findByContentItemId(
    contentItemId: string,
  ): Promise<ContentRefinementReadModel | null>;

  /**
   * Finds refinements by status
   *
   * @param status - Refinement status
   * @returns Array of read models
   */
  findByStatus(status: string): Promise<ContentRefinementReadModel[]>;

  /**
   * Finds chunks for a specific refinement
   *
   * This method provides access to chunk data through the aggregate relationship.
   * Chunks are entities within the ContentRefinement aggregate, so we access
   * them through the aggregate's read repository.
   *
   * @param refinementId - Refinement ID
   * @returns Array of chunk read models
   */
  findChunksByRefinementId(refinementId: string): Promise<ChunkReadModel[]>;

  /**
   * Finds a chunk by its hash within a refinement
   *
   * @param refinementId - Refinement ID
   * @param hash - Chunk hash
   * @returns Chunk read model or null if not found
   */
  findChunkByHash(
    refinementId: string,
    hash: string,
  ): Promise<ChunkReadModel | null>;
}
