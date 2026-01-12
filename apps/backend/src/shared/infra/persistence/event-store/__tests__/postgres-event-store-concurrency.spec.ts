import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fc from 'fast-check';
import { PostgresEventStore } from '../postgres-event-store';
import { DomainEventEntity } from '../entities/domain-event.entity';
import { DomainEvent } from '@/shared/event-sourcing/event-store';
import { ConcurrencyException } from '@/shared/kernel/concurrency-exception';

/**
 * Property-Based Tests for PostgresEventStore - Optimistic Concurrency
 *
 * Feature: event-sourcing-upgrade
 * Property 3: Optimistic Concurrency Enforcement
 *
 * Validates: Requirements 1.5, 1.6
 */
describe('PostgresEventStore - Concurrency Property Tests', () => {
  let eventStore: PostgresEventStore;
  let mockRepository: jest.Mocked<Repository<DomainEventEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    } as any;

    // Create mock data source
    mockDataSource = {
      createQueryRunner: jest.fn(),
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

  describe('Property 3: Optimistic Concurrency Enforcement', () => {
    /**
     * Property: For any two concurrent save operations on the same aggregate
     * with the same expected version, exactly one SHALL succeed and the other
     * SHALL fail with ConcurrencyException.
     *
     * This test simulates concurrent modifications by:
     * 1. Setting up an aggregate at version N
     * 2. Attempting two appends with expectedVersion = N
     * 3. Verifying exactly one succeeds and one fails
     */
    it('should allow only one concurrent save with same expectedVersion', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random aggregate ID and version
          fc.record({
            aggregateId: fc.uuid(),
            currentVersion: fc.integer({ min: 0, max: 10 }),
          }),
          async ({ aggregateId, currentVersion }) => {
            // Track results of concurrent operations
            const results: Array<'success' | 'concurrency-error'> = [];

            // Create two events to append concurrently
            const event1: DomainEvent = {
              eventType: 'TestEvent1',
              aggregateId,
              occurredAt: new Date(),
            };

            const event2: DomainEvent = {
              eventType: 'TestEvent2',
              aggregateId,
              occurredAt: new Date(),
            };

            // Simulate concurrent operations
            let firstOperationCompleted = false;

            // First operation setup
            const mockQueryRunner1 = {
              connect: jest.fn().mockResolvedValue(undefined),
              startTransaction: jest.fn().mockResolvedValue(undefined),
              commitTransaction: jest.fn().mockResolvedValue(undefined),
              rollbackTransaction: jest.fn().mockResolvedValue(undefined),
              release: jest.fn().mockResolvedValue(undefined),
              manager: {
                getRepository: jest.fn().mockReturnValue({
                  createQueryBuilder: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({
                      maxVersion:
                        currentVersion > 0 ? String(currentVersion) : null,
                    }),
                  }),
                }),
                save: jest
                  .fn()
                  .mockImplementation(async (entity: DomainEventEntity) => {
                    // First operation succeeds
                    if (!firstOperationCompleted) {
                      firstOperationCompleted = true;
                      return {
                        ...entity,
                        globalSequence: 1,
                      };
                    }
                    // Second operation fails with unique constraint violation
                    throw new Error(
                      'duplicate key value violates unique constraint "UQ_domain_events_aggregate_version"',
                    );
                  }),
              },
            };

            // Second operation setup (reuses same query runner mock)
            const mockQueryRunner2 = mockQueryRunner1;

            // Mock createQueryRunner to return our mocks
            let queryRunnerCallCount = 0;
            mockDataSource.createQueryRunner.mockImplementation(() => {
              queryRunnerCallCount++;
              return (
                queryRunnerCallCount === 1 ? mockQueryRunner1 : mockQueryRunner2
              ) as any;
            });

            // Execute first operation
            try {
              await eventStore.append(aggregateId, 'TestAggregate', [event1], {
                expectedVersion: currentVersion,
              });
              results.push('success');
            } catch (error) {
              if (error instanceof ConcurrencyException) {
                results.push('concurrency-error');
              } else {
                throw error;
              }
            }

            // Execute second operation (should fail)
            try {
              await eventStore.append(aggregateId, 'TestAggregate', [event2], {
                expectedVersion: currentVersion,
              });
              results.push('success');
            } catch (error) {
              if (error instanceof ConcurrencyException) {
                results.push('concurrency-error');
              } else {
                throw error;
              }
            }

            // Verify exactly one succeeded and one failed
            const successCount = results.filter((r) => r === 'success').length;
            const errorCount = results.filter(
              (r) => r === 'concurrency-error',
            ).length;

            expect(successCount).toBe(1);
            expect(errorCount).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Version mismatch detection
     *
     * Verifies that attempting to append with wrong expectedVersion
     * always fails with ConcurrencyException.
     */
    it('should reject append when expectedVersion does not match current version', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .record({
              aggregateId: fc.uuid(),
              currentVersion: fc.integer({ min: 0, max: 10 }),
              expectedVersion: fc.integer({ min: 0, max: 10 }),
            })
            .filter(
              ({ currentVersion, expectedVersion }) =>
                currentVersion !== expectedVersion,
            ),
          async ({ aggregateId, currentVersion, expectedVersion }) => {
            // Mock getCurrentVersion to return currentVersion
            const mockQueryRunner = {
              connect: jest.fn().mockResolvedValue(undefined),
              startTransaction: jest.fn().mockResolvedValue(undefined),
              commitTransaction: jest.fn().mockResolvedValue(undefined),
              rollbackTransaction: jest.fn().mockResolvedValue(undefined),
              release: jest.fn().mockResolvedValue(undefined),
              manager: {
                getRepository: jest.fn().mockReturnValue({
                  createQueryBuilder: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({
                      maxVersion:
                        currentVersion > 0 ? String(currentVersion) : null,
                    }),
                  }),
                }),
                save: jest.fn(),
              },
            };

            mockDataSource.createQueryRunner.mockReturnValue(
              mockQueryRunner as any,
            );

            const event: DomainEvent = {
              eventType: 'TestEvent',
              aggregateId,
              occurredAt: new Date(),
            };

            // Attempt to append with wrong expectedVersion
            await expect(
              eventStore.append(aggregateId, 'TestAggregate', [event], {
                expectedVersion,
              }),
            ).rejects.toThrow(ConcurrencyException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Successful append increments version
     *
     * Verifies that after successful append, the aggregate version
     * is incremented by the number of events appended.
     */
    it('should increment version by number of events appended', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            aggregateId: fc.uuid(),
            currentVersion: fc.integer({ min: 0, max: 5 }),
            eventCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ aggregateId, currentVersion, eventCount }) => {
            // Mock getCurrentVersion
            const mockQueryRunner = {
              connect: jest.fn().mockResolvedValue(undefined),
              startTransaction: jest.fn().mockResolvedValue(undefined),
              commitTransaction: jest.fn().mockResolvedValue(undefined),
              rollbackTransaction: jest.fn().mockResolvedValue(undefined),
              release: jest.fn().mockResolvedValue(undefined),
              manager: {
                getRepository: jest.fn().mockReturnValue({
                  createQueryBuilder: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getRawOne: jest.fn().mockResolvedValue({
                      maxVersion:
                        currentVersion > 0 ? String(currentVersion) : null,
                    }),
                  }),
                }),
                save: jest
                  .fn()
                  .mockImplementation((entity: DomainEventEntity) => {
                    return Promise.resolve({
                      ...entity,
                      globalSequence: 1,
                    });
                  }),
              },
            };

            mockDataSource.createQueryRunner.mockReturnValue(
              mockQueryRunner as any,
            );

            // Generate events
            const events: DomainEvent[] = Array.from(
              { length: eventCount },
              (_, i) => ({
                eventType: `TestEvent${i}`,
                aggregateId,
                occurredAt: new Date(),
              }),
            );

            // Append events
            const storedEvents = await eventStore.append(
              aggregateId,
              'TestAggregate',
              events,
              {
                expectedVersion: currentVersion,
              },
            );

            // Verify versions are incremented correctly
            expect(storedEvents).toHaveLength(eventCount);
            storedEvents.forEach((event, index) => {
              expect(event.version).toBe(currentVersion + index + 1);
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Unit Tests - Concurrency Control', () => {
    it('should throw ConcurrencyException when expectedVersion does not match', async () => {
      // Mock getCurrentVersion to return 5
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          getRepository: jest.fn().mockReturnValue({
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ maxVersion: '5' }),
            }),
          }),
        },
      };

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);

      const event: DomainEvent = {
        eventType: 'TestEvent',
        aggregateId: 'test-1',
        occurredAt: new Date(),
      };

      // Attempt to append with expectedVersion = 3 (should fail)
      await expect(
        eventStore.append('test-1', 'TestAggregate', [event], {
          expectedVersion: 3,
        }),
      ).rejects.toThrow(ConcurrencyException);

      await expect(
        eventStore.append('test-1', 'TestAggregate', [event], {
          expectedVersion: 3,
        }),
      ).rejects.toThrow('expected version 3, but current version is 5');
    });

    it('should succeed when expectedVersion matches current version', async () => {
      // Mock getCurrentVersion to return 5
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          getRepository: jest.fn().mockReturnValue({
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ maxVersion: '5' }),
            }),
          }),
          save: jest.fn().mockImplementation((entity: DomainEventEntity) => {
            return Promise.resolve({
              ...entity,
              globalSequence: 1,
            });
          }),
        },
      };

      mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner as any);

      const event: DomainEvent = {
        eventType: 'TestEvent',
        aggregateId: 'test-1',
        occurredAt: new Date(),
      };

      // Append with correct expectedVersion = 5 (should succeed)
      const result = await eventStore.append(
        'test-1',
        'TestAggregate',
        [event],
        {
          expectedVersion: 5,
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(6);
    });
  });
});
