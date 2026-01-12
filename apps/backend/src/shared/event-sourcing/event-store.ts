/**
 * Event Store Interfaces
 *
 * Defines the contracts for the Event Store - the append-only store
 * that serves as the source of truth for all aggregate state.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

/**
 * Metadata associated with each stored event
 */
export interface EventMetadata {
  /**
   * Correlation ID for tracing related events across the system
   */
  correlationId: string;

  /**
   * ID of the event that caused this event (for event chains)
   */
  causationId?: string;

  /**
   * User ID who triggered the action (if applicable)
   */
  userId?: string;

  /**
   * Timestamp when the event occurred
   */
  timestamp: Date;
}

/**
 * Representation of an event as stored in the Event Store
 */
export interface StoredEvent {
  /**
   * Global sequence number - monotonically increasing across all events
   * Requirement: 1.2
   */
  globalSequence: number;

  /**
   * ID of the aggregate this event belongs to
   */
  aggregateId: string;

  /**
   * Type of the aggregate (e.g., 'IngestionJob', 'ContentItem')
   */
  aggregateType: string;

  /**
   * Type of the event (e.g., 'JobScheduled', 'ContentIngested')
   */
  eventType: string;

  /**
   * Serialized event data as JSON
   * Requirement: 1.3
   */
  eventData: Record<string, unknown>;

  /**
   * Event metadata for tracing and auditing
   */
  metadata: EventMetadata;

  /**
   * Version of the event within the aggregate's stream
   * Requirement: 1.3
   */
  version: number;

  /**
   * Schema version for event evolution/upcasting
   */
  schemaVersion: number;

  /**
   * Timestamp when the event was stored
   * Requirement: 1.3
   */
  timestamp: Date;

  /**
   * Optional idempotency key for deduplication
   */
  idempotencyKey?: string;
}

/**
 * Options for appending events to the Event Store
 */
export interface AppendOptions {
  /**
   * Expected version of the aggregate for optimistic concurrency
   * Requirement: 1.5
   */
  expectedVersion: number;

  /**
   * Optional idempotency key to prevent duplicate events
   */
  idempotencyKey?: string;
}

/**
 * Query parameters for loading an aggregate's event stream
 */
export interface StreamQuery {
  /**
   * ID of the aggregate to load events for
   */
  aggregateId: string;

  /**
   * Optional: Start loading from this version (inclusive)
   * Requirement: 1.4
   */
  fromVersion?: number;

  /**
   * Optional: Stop loading at this version (inclusive)
   * Requirement: 1.4
   */
  toVersion?: number;
}

/**
 * Query parameters for global event queries
 */
export interface GlobalQuery {
  /**
   * Optional: Filter by aggregate type
   */
  aggregateType?: string;

  /**
   * Optional: Start from this global sequence (inclusive)
   */
  fromSequence?: number;

  /**
   * Optional: Stop at this global sequence (inclusive)
   */
  toSequence?: number;

  /**
   * Optional: Filter events from this timestamp
   */
  fromTimestamp?: Date;

  /**
   * Optional: Filter events until this timestamp
   */
  toTimestamp?: Date;

  /**
   * Optional: Maximum number of events to return
   */
  limit?: number;
}

/**
 * Represents an active subscription to the Event Store
 */
export interface Subscription {
  /**
   * Unique identifier for this subscription
   */
  id: string;

  /**
   * Unsubscribes from the event stream
   */
  unsubscribe(): void;
}

/**
 * Domain Event interface - base for all domain events
 */
export interface DomainEvent {
  /**
   * Unique event type identifier
   */
  readonly eventType: string;

  /**
   * Aggregate ID this event belongs to
   */
  readonly aggregateId: string;

  /**
   * When the event occurred
   */
  readonly occurredAt: Date;
}

/**
 * Event Store Interface
 *
 * Append-only store for domain events.
 * Source of truth for all aggregate state.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export interface IEventStore {
  /**
   * Appends events to an aggregate's stream
   *
   * @param aggregateId - ID of the aggregate
   * @param aggregateType - Type of the aggregate
   * @param events - Events to append
   * @param options - Append options including expected version
   * @returns The stored events with assigned sequence numbers
   * @throws ConcurrencyException if expectedVersion doesn't match
   *
   * Requirement: 1.1 (append-only), 1.5 (optimistic concurrency)
   */
  append(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    options: AppendOptions,
  ): Promise<StoredEvent[]>;

  /**
   * Loads all events for an aggregate's stream
   *
   * @param query - Query parameters for the stream
   * @returns Events in the stream, ordered by version
   *
   * Requirement: 1.4 (version range filtering)
   */
  loadStream(query: StreamQuery): Promise<StoredEvent[]>;

  /**
   * Queries events globally (across aggregates)
   *
   * @param query - Global query parameters
   * @returns Events matching the query, ordered by global sequence
   */
  queryEvents(query: GlobalQuery): Promise<StoredEvent[]>;

  /**
   * Subscribes to new events (live subscription)
   *
   * @param fromSequence - Start receiving events from this sequence
   * @param handler - Callback for each event
   * @returns Subscription handle for unsubscribing
   */
  subscribe(
    fromSequence: number,
    handler: (event: StoredEvent) => Promise<void>,
  ): Subscription;

  /**
   * Gets the current global sequence number
   *
   * @returns The highest global sequence number in the store
   */
  getCurrentSequence(): Promise<number>;
}
