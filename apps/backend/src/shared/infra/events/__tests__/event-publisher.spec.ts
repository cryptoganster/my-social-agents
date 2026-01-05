import * as fc from 'fast-check';
import { EventPublisherService } from '../event-publisher';
import { DomainEvent } from '@/shared/kernel';

describe('EventPublisherService', () => {
  let service: EventPublisherService;

  beforeEach(() => {
    service = new EventPublisherService();
    service.clearPublishedEvents();
  });

  describe('Unit Tests', () => {
    it('should publish a single event', async () => {
      const event: DomainEvent = {
        eventId: 'evt-123',
        eventType: 'ContentIngested',
        occurredAt: new Date(),
        aggregateId: 'content-456',
        payload: { contentHash: 'abc123' },
      };

      await service.publish(event);

      const published = service.getPublishedEvents();
      expect(published).toHaveLength(1);
      expect(published[0]).toEqual(event);
    });

    it('should publish multiple events in batch', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'evt-1',
          eventType: 'ContentIngested',
          occurredAt: new Date(),
          aggregateId: 'content-1',
          payload: {},
        },
        {
          eventId: 'evt-2',
          eventType: 'ContentIngested',
          occurredAt: new Date(),
          aggregateId: 'content-2',
          payload: {},
        },
      ];

      await service.publishBatch(events);

      const published = service.getPublishedEvents();
      expect(published).toHaveLength(2);
      expect(published).toEqual(events);
    });

    it('should throw error for null event', async () => {
      await expect(service.publish(null as unknown as DomainEvent)).rejects.toThrow(
        'Cannot publish null or undefined event',
      );
    });

    it('should throw error for event without eventId', async () => {
      const invalidEvent = {
        eventType: 'Test',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        payload: {},
      } as unknown as DomainEvent;

      await expect(service.publish(invalidEvent)).rejects.toThrow(
        'Invalid event: must have eventId, eventType, and aggregateId',
      );
    });

    it('should throw error for event without eventType', async () => {
      const invalidEvent = {
        eventId: 'evt-1',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        payload: {},
      } as unknown as DomainEvent;

      await expect(service.publish(invalidEvent)).rejects.toThrow(
        'Invalid event: must have eventId, eventType, and aggregateId',
      );
    });

    it('should throw error for event without aggregateId', async () => {
      const invalidEvent = {
        eventId: 'evt-1',
        eventType: 'Test',
        occurredAt: new Date(),
        payload: {},
      } as unknown as DomainEvent;

      await expect(service.publish(invalidEvent)).rejects.toThrow(
        'Invalid event: must have eventId, eventType, and aggregateId',
      );
    });

    it('should handle empty batch gracefully', async () => {
      await service.publishBatch([]);

      const published = service.getPublishedEvents();
      expect(published).toHaveLength(0);
    });

    it('should throw error for invalid event in batch', async () => {
      const events = [
        {
          eventId: 'evt-1',
          eventType: 'Test',
          occurredAt: new Date(),
          aggregateId: 'agg-1',
          payload: {},
        },
        {
          eventId: 'evt-2',
          // Missing eventType
          occurredAt: new Date(),
          aggregateId: 'agg-2',
          payload: {},
        } as unknown as DomainEvent,
      ];

      await expect(service.publishBatch(events)).rejects.toThrow(
        'Invalid event in batch',
      );
    });

    it('should clear published events', async () => {
      const event: DomainEvent = {
        eventId: 'evt-1',
        eventType: 'Test',
        occurredAt: new Date(),
        aggregateId: 'agg-1',
        payload: {},
      };

      await service.publish(event);
      expect(service.getPublishedEvents()).toHaveLength(1);

      service.clearPublishedEvents();
      expect(service.getPublishedEvents()).toHaveLength(0);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: content-ingestion, Property 22: Event Publishing on Persistence
    // Validates: Requirements 10.2
    it('Property 22: Event Publishing on Persistence - all published events are retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              eventId: fc.string({ minLength: 1 }),
              eventType: fc.string({ minLength: 1 }),
              occurredAt: fc.date(),
              aggregateId: fc.string({ minLength: 1 }),
              payload: fc.dictionary(fc.string(), fc.anything()),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (events: DomainEvent[]) => {
            // Create a fresh service instance for each test run
            const testService = new EventPublisherService();

            // Publish all events
            for (const event of events) {
              await testService.publish(event);
            }

            // All events should be retrievable
            const published = testService.getPublishedEvents();
            expect(published).toHaveLength(events.length);

            // Each event should match
            events.forEach((event, index) => {
              expect(published[index]).toEqual(event);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 22: Event Publishing on Persistence - batch publishing preserves order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              eventId: fc.string({ minLength: 1 }),
              eventType: fc.string({ minLength: 1 }),
              occurredAt: fc.date(),
              aggregateId: fc.string({ minLength: 1 }),
              payload: fc.dictionary(fc.string(), fc.anything()),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (events: DomainEvent[]) => {
            // Create a fresh service instance for each test run
            const testService = new EventPublisherService();

            // Publish batch
            await testService.publishBatch(events);

            // Events should be in same order
            const published = testService.getPublishedEvents();
            expect(published).toHaveLength(events.length);

            events.forEach((event, index) => {
              expect(published[index].eventId).toBe(event.eventId);
              expect(published[index].eventType).toBe(event.eventType);
              expect(published[index].aggregateId).toBe(event.aggregateId);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 22: Event Publishing on Persistence - multiple publishes accumulate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numPublishes: number) => {
            // Create a fresh service instance for each test run
            const testService = new EventPublisherService();

            const allEvents: DomainEvent[] = [];

            // Publish multiple times
            for (let i = 0; i < numPublishes; i++) {
              const event: DomainEvent = {
                eventId: `evt-${i}`,
                eventType: 'Test',
                occurredAt: new Date(),
                aggregateId: `agg-${i}`,
                payload: { index: i },
              };
              allEvents.push(event);
              await testService.publish(event);
            }

            // All events should be accumulated
            const published = testService.getPublishedEvents();
            expect(published).toHaveLength(numPublishes);
            expect(published).toEqual(allEvents);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 22: Event Publishing on Persistence - valid events never throw', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            eventId: fc.string({ minLength: 1 }),
            eventType: fc.string({ minLength: 1 }),
            occurredAt: fc.date(),
            aggregateId: fc.string({ minLength: 1 }),
            payload: fc.dictionary(fc.string(), fc.anything()),
          }),
          async (event: DomainEvent) => {
            // Create a fresh service instance for each test run
            const testService = new EventPublisherService();

            // Valid events should never throw
            await expect(testService.publish(event)).resolves.not.toThrow();

            // Event should be published
            const published = testService.getPublishedEvents();
            expect(published).toHaveLength(1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
