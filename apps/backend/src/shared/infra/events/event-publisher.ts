import { Injectable } from '@nestjs/common';
import { DomainEvent, EventPublisher } from '@/shared/kernel';

/**
 * EventPublisherService
 *
 * Concrete implementation of EventPublisher interface.
 * Publishes domain events to a message bus or event store.
 *
 * Current implementation stores events in memory for testing.
 * TODO: Integrate with actual message bus (RabbitMQ, Kafka, etc.)
 *
 * This is shared infrastructure used across all bounded contexts.
 */
@Injectable()
export class EventPublisherService implements EventPublisher {
  private publishedEvents: DomainEvent[] = [];

  /**
   * Publishes a single domain event
   */
  publish(event: DomainEvent): Promise<void> {
    // Validate event
    if (event === null || event === undefined) {
      throw new Error('Cannot publish null or undefined event');
    }

    if (!event.eventId || !event.eventType || !event.aggregateId) {
      throw new Error(
        'Invalid event: must have eventId, eventType, and aggregateId',
      );
    }

    // TODO: Publish to actual message bus
    // For now, store in memory for testing
    this.publishedEvents.push(event);

    return Promise.resolve();
  }

  /**
   * Publishes multiple domain events in a batch
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    // Validate all events first
    for (const event of events) {
      if (
        event === null ||
        event === undefined ||
        !event.eventId ||
        !event.eventType ||
        !event.aggregateId
      ) {
        throw new Error('Invalid event in batch');
      }
    }

    // Publish individually
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Get all published events (for testing)
   */
  getPublishedEvents(): DomainEvent[] {
    return [...this.publishedEvents];
  }

  /**
   * Clear published events (for testing)
   */
  clearPublishedEvents(): void {
    this.publishedEvents = [];
  }
}
