/**
 * ReadModel Base Interface
 *
 * Base interface for all read models across bounded contexts.
 * Read models are denormalized, query-optimized data structures
 * that are updated by domain events.
 *
 * Key Characteristics:
 * - Denormalized for query performance
 * - Updated asynchronously via event handlers
 * - No business logic (pure data)
 * - Optimized for specific query patterns
 */
export interface ReadModel {
  /**
   * Unique identifier for the read model
   */
  id: string;

  /**
   * Timestamp when the read model was last updated
   */
  updatedAt: Date;

  /**
   * Version of the read model for optimistic locking
   * Incremented each time the read model is updated
   */
  version: number;
}

/**
 * ReadModelRepository Interface
 *
 * Base interface for read model repositories.
 * Provides common query operations for read models.
 *
 * @template T - The read model type
 */
export interface IReadModelRepository<T extends ReadModel> {
  /**
   * Find a read model by its ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Save or update a read model
   */
  save(model: T): Promise<void>;

  /**
   * Delete a read model by its ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a read model exists
   */
  exists(id: string): Promise<boolean>;
}
