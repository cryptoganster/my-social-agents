/**
 * DomainEvent
 *
 * Base interface for all domain events.
 * Events represent something that has happened in the domain.
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  aggregateId: string;
  payload: Record<string, unknown>;
}

/**
 * EventPublisher Interface
 *
 * Interface for publishing domain events to a message bus or event store.
 * Enables cross-context communication and event-driven architecture.
 *
 * Requirements: 10.2
 */
export interface EventPublisher {
  /**
   * Publishes a single domain event
   * Throws an error if publishing fails
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events in a batch
   * More efficient than publishing events individually
   * Throws an error if publishing fails
   */
  publishBatch(events: DomainEvent[]): Promise<void>;
}
