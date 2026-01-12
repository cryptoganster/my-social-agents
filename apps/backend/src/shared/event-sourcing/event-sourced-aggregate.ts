/**
 * Event-Sourced Aggregate Base Class
 *
 * Abstract base class for aggregates that derive their state from events.
 * Extends the standard AggregateRoot with event replay capabilities.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { AggregateRoot, AggregateVersion } from '../kernel';
import { DomainEvent } from './event-store';

/**
 * EventSourcedAggregate<TId>
 *
 * Base class for event-sourced aggregates.
 * State is derived entirely from events through replay.
 *
 * ## Key Features
 *
 * - **Event Replay**: State is reconstituted by replaying events
 * - **Deterministic**: Same events always produce same state
 * - **Uncommitted Events**: Tracks new events until persisted
 * - **Version Tracking**: Maintains version for optimistic concurrency
 *
 * ## Usage Example
 *
 * ```typescript
 * export class IngestionJob extends EventSourcedAggregate<string> {
 *   private _status: IngestionStatus;
 *
 *   protected applyEvent(event: DomainEvent): void {
 *     switch (event.eventType) {
 *       case 'JobScheduled':
 *         this.applyJobScheduled(event as JobScheduled);
 *         break;
 *       case 'JobStarted':
 *         this.applyJobStarted(event as JobStarted);
 *         break;
 *     }
 *   }
 *
 *   private applyJobScheduled(event: JobScheduled): void {
 *     this._status = IngestionStatus.pending();
 *   }
 *
 *   start(): void {
 *     if (!this._status.isPending()) {
 *       throw new Error('Can only start pending jobs');
 *     }
 *     this.raise(new JobStarted(this.id, new Date()));
 *   }
 * }
 * ```
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @template TId - The type of the aggregate's unique identifier
 */
export abstract class EventSourcedAggregate<
  TId = string,
> extends AggregateRoot<TId> {
  private _uncommittedEvents: DomainEvent[] = [];

  protected constructor(id: TId, version: AggregateVersion) {
    super(id, version);
  }

  /**
   * Applies an event to update aggregate state.
   * Called during replay and when new events are raised.
   *
   * MUST be implemented by subclasses to handle each event type.
   * This method should be pure - no side effects, only state changes.
   *
   * Requirement: 2.2
   *
   * @param event - The domain event to apply
   */
  protected abstract applyEvent(event: DomainEvent): void;

  /**
   * Creates and applies a new event.
   * Event is added to uncommitted events for persistence.
   *
   * Use this method in business methods to record state changes:
   *
   * ```typescript
   * start(): void {
   *   this.raise(new JobStarted(this.id, new Date()));
   * }
   * ```
   *
   * Requirement: 2.3
   *
   * @param event - The domain event to raise
   */
  protected raise(event: DomainEvent): void {
    this.applyEvent(event);
    this._uncommittedEvents.push(event);
    this.incrementVersion();
  }

  /**
   * Replays events to reconstitute aggregate state.
   * Used when loading aggregate from event store.
   *
   * Events are applied in order, and version is incremented for each.
   * This ensures the aggregate version matches the number of events.
   *
   * Requirement: 2.1
   *
   * @param events - Events to replay, in order
   */
  public replayEvents(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this.incrementVersion();
    }
  }

  /**
   * Gets uncommitted events for persistence.
   * These are events raised since the aggregate was loaded.
   *
   * Requirement: 2.4
   *
   * @returns Copy of uncommitted events array
   */
  public getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  /**
   * Clears uncommitted events after successful persistence.
   * Called by the repository after events are saved.
   *
   * Requirement: 2.5
   */
  public clearUncommittedEvents(): void {
    this._uncommittedEvents = [];
  }

  /**
   * Checks if aggregate has uncommitted events.
   *
   * @returns true if there are events pending persistence
   */
  public hasUncommittedEvents(): boolean {
    return this._uncommittedEvents.length > 0;
  }

  /**
   * Gets the count of uncommitted events.
   *
   * @returns Number of uncommitted events
   */
  public getUncommittedEventCount(): number {
    return this._uncommittedEvents.length;
  }
}
