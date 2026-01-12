/**
 * Event-Sourced Repository Interface
 *
 * Repository for event-sourced aggregates (WRITE SIDE ONLY).
 * Handles loading aggregates by replaying events and saving
 * uncommitted events to the event store.
 *
 * CQRS Clarification:
 * - This interface is for WRITE operations only (Command side)
 * - Read operations continue using existing Read Repositories
 * - Read Repositories query projection tables (not event store)
 *
 * Requirements: 2.1, 2.5
 */

import { EventSourcedAggregate } from './event-sourced-aggregate';

/**
 * IEventSourcedRepository<T>
 *
 * Repository interface for event-sourced aggregates.
 *
 * ## CQRS Architecture
 *
 * ```
 * WRITE SIDE (Commands)                READ SIDE (Queries)
 * ─────────────────────                ───────────────────
 *
 * ┌──────────────────┐                 ┌──────────────────┐
 * │ Command Handler  │                 │ Query Handler    │
 * └────────┬─────────┘                 └────────┬─────────┘
 *          │                                    │
 *          ▼                                    ▼
 * ┌──────────────────┐                 ┌──────────────────┐
 * │ IEventSourced    │                 │ IReadRepository  │
 * │ Repository       │                 │ (unchanged)      │
 * │ (NEW - ES)       │                 │                  │
 * └────────┬─────────┘                 └────────┬─────────┘
 *          │                                    │
 *          ▼                                    ▼
 * ┌──────────────────┐                 ┌──────────────────┐
 * │ Event Store      │ ──── events ──► │ Projection       │
 * │ (source of truth)│                 │ Tables           │
 * └──────────────────┘                 └──────────────────┘
 * ```
 *
 * ## Usage Example
 *
 * ```typescript
 * @CommandHandler(StartJobCommand)
 * export class StartJobHandler {
 *   constructor(
 *     @Inject('IEventSourcedRepository<IngestionJob>')
 *     private readonly repository: IEventSourcedRepository<IngestionJob>,
 *   ) {}
 *
 *   async execute(command: StartJobCommand): Promise<void> {
 *     // Load aggregate by replaying events
 *     const job = await this.repository.load(command.jobId);
 *     if (!job) {
 *       throw new Error('Job not found');
 *     }
 *
 *     // Execute business logic (raises events internally)
 *     job.start();
 *
 *     // Save uncommitted events to event store
 *     await this.repository.save(job);
 *   }
 * }
 * ```
 *
 * @template T - The type of the event-sourced aggregate
 */
export interface IEventSourcedRepository<T extends EventSourcedAggregate> {
  /**
   * Loads aggregate by replaying events (WRITE SIDE)
   *
   * Used by Command Handlers to load aggregate for modification.
   * Returns null if aggregate doesn't exist.
   *
   * Implementation should:
   * 1. Check for snapshot (if snapshot store is configured)
   * 2. Load events from snapshot version (or 0 if no snapshot)
   * 3. Create aggregate instance and replay events
   *
   * Requirement: 2.1
   *
   * @param aggregateId - ID of the aggregate to load
   * @returns The reconstituted aggregate, or null if not found
   */
  load(aggregateId: string): Promise<T | null>;

  /**
   * Saves uncommitted events to event store (WRITE SIDE)
   *
   * Implementation should:
   * 1. Get uncommitted events from aggregate
   * 2. Append events to event store with optimistic concurrency
   * 3. Clear uncommitted events on success
   * 4. Optionally create snapshot if threshold exceeded
   *
   * @throws ConcurrencyException on version conflict
   *
   * Requirement: 2.5
   *
   * @param aggregate - The aggregate with uncommitted events
   */
  save(aggregate: T): Promise<void>;

  /**
   * Checks if aggregate exists in the event store
   *
   * @param aggregateId - ID of the aggregate to check
   * @returns true if at least one event exists for this aggregate
   */
  exists(aggregateId: string): Promise<boolean>;
}
