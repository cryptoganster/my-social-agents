import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fc from 'fast-check';
import { PostgresEventStore } from '../postgres-event-store';
import { DomainEventEntity } from '../entities/domain-event.entity';
import { DomainEvent } from '@/shared/event-sourcing/event-store';

/**
 * Property-Based Tests for PostgresEventStore
 *
 * Feature: event-sourcing-upgrade
 * Property 1: Event Store Append-Only with Monotonic Sequence
 *
 * Validates: Requirements 1.1, 1.2
 */
describe('PostgresEventStore - Property Tests', () => {
  let eventStore: PostgresEventStore;
  let mockRepository: jest.Mocked<Repository<DomainEventEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    } as any;

    // Create mock query runner
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn().mockReturnValue(mockRepository),
        save: jest.fn(),
      },
    };

    // Create mock data source
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresEventStore,
        {
          provide: getRepositoryToken(DomainEventEntity),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    eventStore = module.get<PostgresEventStore>(PostgresEventStore);
  });

  describe('Property 1: Event Store Append-Only with Monotonic Sequence', () => {
    /**
     * Property: For any sequence of events appended to the Event Store,
     * the global sequence numbers SHALL be strictly monotonically increasing.
     *
     * This test generates random event sequences and verifies that:
     * 1. Each appended event gets a unique global_sequence
     * 2. Sequences are strictly increasing (no gaps, no duplicates)
     * 3. Order is preserved across multiple append operations
     */
    it('should assign strictly increasing global_sequence to appended events', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 1-10 events per append operation
          fc.array(fc.integer({ min: 1, max: 10 }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (eventCounts) => {
            // Track all assigned sequences
            const allSequences: number[] = [];
            let currentSequence = 0;

            // Mock getCurrentVersion to return 0 (no existing events)
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ maxVersion: null }),
            };
            mockRepository.createQueryBuilder.mockReturnValue(
              mockQueryBuilder as any,
            );

            // For each batch of events
            for (const count of eventCounts) {
              // Generate test events
              const events: DomainEvent[] = Array.from(
                { length: count },
                () => ({
                  eventType: 'TestEvent',
                  aggregateId: 'test-aggregate',
                  occurredAt: new Date(),
                }),
              );

              // Mock save to assign sequential global_sequence
              const mockQueryRunner = mockDataSource.createQueryRunner();
              mockQueryRunner.manager.save = jest
                .fn()
                .mockImplementation((entity: DomainEventEntity) => {
                  currentSequence++;
                  return Promise.resolve({
                    ...entity,
                    globalSequence: currentSequence,
                  });
                });

              // Append events
              const storedEvents = await eventStore.append(
                'test-aggregate',
                'TestAggregate',
                events,
                { expectedVersion: 0 },
              );

              // Collect sequences
              const sequences = storedEvents.map((e) => e.globalSequence);
              allSequences.push(...sequences);

              // Verify sequences are strictly increasing within this batch
              for (let i = 1; i < sequences.length; i++) {
                expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
              }
            }

            // Verify all sequences are strictly increasing globally
            for (let i = 1; i < allSequences.length; i++) {
              expect(allSequences[i]).toBeGreaterThan(allSequences[i - 1]);
            }

            // Verify no duplicates
            const uniqueSequences = new Set(allSequences);
            expect(uniqueSequences.size).toBe(allSequences.length);

            // Verify sequences start from 1 and have no gaps
            const expectedSequences = Array.from(
              { length: allSequences.length },
              (_, i) => i + 1,
            );
            expect(allSequences).toEqual(expectedSequences);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Events are append-only (cannot be modified or deleted)
     *
     * This is enforced by the database schema (no UPDATE/DELETE operations)
     * and the Event Store implementation (only append() method).
     */
    it('should only provide append operations (no update or delete)', () => {
      // Verify Event Store interface only has append, not update/delete
      expect(eventStore.append).toBeDefined();
      expect((eventStore as any).update).toBeUndefined();
      expect((eventStore as any).delete).toBeUndefined();
      expect((eventStore as any).remove).toBeUndefined();
    });

    /**
     * Property: Global sequence is unique across all aggregates
     *
     * Verifies that events from different aggregates share the same
     * global sequence space (no per-aggregate sequences).
     */
    it('should assign unique global_sequence across different aggregates', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2-5 different aggregate IDs
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          async (aggregateIds) => {
            const allSequences: number[] = [];
            let currentSequence = 0;

            // Mock getCurrentVersion to return 0 for all aggregates
            const mockQueryBuilder = {
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ maxVersion: null }),
            };
            mockRepository.createQueryBuilder.mockReturnValue(
              mockQueryBuilder as any,
            );

            // Append one event to each aggregate
            for (const aggregateId of aggregateIds) {
              const event: DomainEvent = {
                eventType: 'TestEvent',
                aggregateId,
                occurredAt: new Date(),
              };

              // Mock save to assign sequential global_sequence
              const mockQueryRunner = mockDataSource.createQueryRunner();
              mockQueryRunner.manager.save = jest
                .fn()
                .mockImplementation((entity: DomainEventEntity) => {
                  currentSequence++;
                  return Promise.resolve({
                    ...entity,
                    globalSequence: currentSequence,
                  });
                });

              const storedEvents = await eventStore.append(
                aggregateId,
                'TestAggregate',
                [event],
                { expectedVersion: 0 },
              );

              allSequences.push(storedEvents[0].globalSequence);
            }

            // Verify all sequences are unique
            const uniqueSequences = new Set(allSequences);
            expect(uniqueSequences.size).toBe(allSequences.length);

            // Verify sequences are strictly increasing
            for (let i = 1; i < allSequences.length; i++) {
              expect(allSequences[i]).toBeGreaterThan(allSequences[i - 1]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests - Append Operations', () => {
    it('should append events successfully', async () => {
      // Mock getCurrentVersion
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxVersion: null }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock save
      const mockQueryRunner = mockDataSource.createQueryRunner();
      mockQueryRunner.manager.save = jest
        .fn()
        .mockImplementation((entity: DomainEventEntity) => {
          return Promise.resolve({
            ...entity,
            globalSequence: 1,
          });
        });

      const event: DomainEvent = {
        eventType: 'TestEvent',
        aggregateId: 'test-1',
        occurredAt: new Date(),
      };

      const result = await eventStore.append(
        'test-1',
        'TestAggregate',
        [event],
        {
          expectedVersion: 0,
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0].globalSequence).toBe(1);
      expect(result[0].aggregateId).toBe('test-1');
      expect(result[0].eventType).toBe('TestEvent');
    });

    it('should return empty array when no events provided', async () => {
      const result = await eventStore.append('test-1', 'TestAggregate', [], {
        expectedVersion: 0,
      });

      expect(result).toEqual([]);
    });
  });
});
