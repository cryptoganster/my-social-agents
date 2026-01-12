/**
 * Snapshot Store Interfaces
 *
 * Defines the contracts for storing and retrieving aggregate snapshots.
 * Snapshots optimize aggregate reconstitution by reducing the number
 * of events that need to be replayed.
 *
 * Requirements: 3.1, 3.2, 3.5
 */

/**
 * Represents a snapshot of an aggregate's state at a specific version
 *
 * @template T - The type of the aggregate state
 */
export interface Snapshot<T> {
  /**
   * ID of the aggregate this snapshot belongs to
   */
  aggregateId: string;

  /**
   * Type of the aggregate (e.g., 'IngestionJob', 'ContentItem')
   */
  aggregateType: string;

  /**
   * Version of the aggregate when the snapshot was taken
   */
  version: number;

  /**
   * Serialized state of the aggregate
   * Requirement: 3.5
   */
  state: T;

  /**
   * Timestamp when the snapshot was created
   */
  createdAt: Date;
}

/**
 * Snapshot Store Interface
 *
 * Manages aggregate snapshots for optimized reconstitution.
 *
 * Requirements: 3.1, 3.2, 3.5
 */
export interface ISnapshotStore {
  /**
   * Saves a snapshot of aggregate state
   *
   * @param snapshot - The snapshot to save
   *
   * Requirement: 3.1
   */
  save<T>(snapshot: Snapshot<T>): Promise<void>;

  /**
   * Loads the latest snapshot for an aggregate
   *
   * @param aggregateId - ID of the aggregate
   * @param aggregateType - Type of the aggregate
   * @returns The latest snapshot, or null if none exists
   *
   * Requirement: 3.2
   */
  load<T>(
    aggregateId: string,
    aggregateType: string,
  ): Promise<Snapshot<T> | null>;

  /**
   * Deletes old snapshots, keeping only the most recent ones
   *
   * @param aggregateId - ID of the aggregate
   * @param keepCount - Number of recent snapshots to keep
   */
  cleanup(aggregateId: string, keepCount: number): Promise<void>;
}
