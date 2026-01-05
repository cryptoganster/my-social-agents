/**
 * DomainEvent
 *
 * Base interface for all domain events across all bounded contexts.
 * Events represent something that has happened in the domain.
 *
 * All domain events must include:
 * - eventId: Unique identifier for the event
 * - eventType: Type discriminator (e.g., "ContentIngested", "JobCompleted")
 * - occurredAt: When the event occurred
 * - aggregateId: ID of the aggregate that produced the event
 * - payload: Event-specific data
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
 * This is a shared abstraction used across all bounded contexts.
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
