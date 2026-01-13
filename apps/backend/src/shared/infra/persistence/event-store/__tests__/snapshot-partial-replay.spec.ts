import * as fc from 'fast-check';
import { EventSourcedAggregate } from '@/shared/event-sourcing/event-sourced-aggregate';
import { DomainEvent } from '@/shared/event-sourcing/event-store';
import { Snapshot } from '@/shared/event-sourcing/snapshot-store';
import { AggregateVersion } from '@/shared/kernel';

/**
 * Test Domain Events for snapshot property testing
 */
class ValueSet implements DomainEvent {
  readonly eventType = 'ValueSet';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly value: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

class ValueAdded implements DomainEvent {
  readonly eventType = 'ValueAdded';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

class ValueMultiplied implements DomainEvent {
  readonly eventType = 'ValueMultiplied';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly factor: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

type TestEvent = ValueSet | ValueAdded | ValueMultiplied;

/**
 * Test Aggregate State for snapshot serialization
 */
interface TestAggregateState {
  value: number;
  operationCount: number;
}

/**
 * Test Aggregate for snapshot property testing
 *
 * A simple aggregate that tracks a numeric value through events.
 * Used to verify snapshot partial replay properties.
 */
class TestAggregate extends EventSourcedAggregate<string> {
  private _value: number = 0;
  private _operationCount: number = 0;

  private constructor(id: string, version: AggregateVersion) {
    super(id, version);
  }

  /**
   * Creates a new aggregate
   */
  static create(id: string): TestAggregate {
    return new TestAggregate(id, AggregateVersion.initial());
  }

  /**
   * Creates an aggregate for replay (no initial state)
   */
  static forReplay(id: string): TestAggregate {
    return new TestAggregate(id, AggregateVersion.initial());
  }

  /**
   * Creates an aggregate from a snapshot
   */
  static fromSnapshot(snapshot: Snapshot<TestAggregateState>): TestAggregate {
    const aggregate = new TestAggregate(
      snapshot.aggregateId,
      AggregateVersion.fromNumber(snapshot.version),
    );
    aggregate._value = snapshot.state.value;
    aggregate._operationCount = snapshot.state.operationCount;
    return aggregate;
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'ValueSet':
        this.applyValueSet(event as ValueSet);
        break;
      case 'ValueAdded':
        this.applyValueAdded(event as ValueAdded);
        break;
      case 'ValueMultiplied':
        this.applyValueMultiplied(event as ValueMultiplied);
        break;
      default:
        throw new Error(`Unknown event type: ${event.eventType}`);
    }
  }

  private applyValueSet(event: ValueSet): void {
    this._value = event.value;
    this._operationCount++;
  }

  private applyValueAdded(event: ValueAdded): void {
    this._value += event.amount;
    this._operationCount++;
  }

  private applyValueMultiplied(event: ValueMultiplied): void {
    this._value *= event.factor;
    this._operationCount++;
  }

  // Business methods that raise events
  setValue(value: number): void {
    this.raise(new ValueSet(this.id, value));
  }

  addValue(amount: number): void {
    this.raise(new ValueAdded(this.id, amount));
  }

  multiplyValue(factor: number): void {
    this.raise(new ValueMultiplied(this.id, factor));
  }

  // Getters for state verification
  get value(): number {
    return this._value;
  }

  get operationCount(): number {
    return this._operationCount;
  }

  /**
   * Returns state snapshot for comparison
   */
  getStateSnapshot(): {
    value: number;
    operationCount: number;
    version: number;
  } {
    return {
      value: this._value,
      operationCount: this._operationCount,
      version: this.version.value,
    };
  }

  /**
   * Creates a snapshot of current state
   */
  createSnapshot(): Snapshot<TestAggregateState> {
    return {
      aggregateId: this.id,
      aggregateType: 'TestAggregate',
      version: this.version.value,
      state: {
        value: this._value,
        operationCount: this._operationCount,
      },
      createdAt: new Date(),
    };
  }
}

/**
 * Arbitrary for generating random test events
 */
const testEventArbitrary = (aggregateId: string): fc.Arbitrary<TestEvent> =>
  fc
    .oneof(
      fc.record({
        type: fc.constant('set' as const),
        value: fc.integer({ min: -1000, max: 1000 }),
      }),
      fc.record({
        type: fc.constant('add' as const),
        amount: fc.integer({ min: -100, max: 100 }),
      }),
      fc.record({
        type: fc.constant('multiply' as const),
        factor: fc.integer({ min: -10, max: 10 }),
      }),
    )
    .map((spec) => {
      const now = new Date();
      switch (spec.type) {
        case 'set':
          return new ValueSet(aggregateId, spec.value, now);
        case 'add':
          return new ValueAdded(aggregateId, spec.amount, now);
        case 'multiply':
          return new ValueMultiplied(aggregateId, spec.factor, now);
      }
    });

describe('Snapshot Partial Replay', () => {
  describe('Property-Based Tests', () => {
    /**
     * Feature: event-sourcing-upgrade, Property 4: Snapshot Partial Replay
     *
     * For any aggregate with a snapshot at version N and events up to version M
     * (where M > N), loading the aggregate SHALL produce the same state as
     * replaying all events from version 0 to M.
     *
     * Validates: Requirements 3.2, 3.3
     */
    describe('Property 4: Snapshot Partial Replay', () => {
      it('should produce identical state when loading from snapshot + partial replay vs full replay', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(testEventArbitrary('placeholder'), {
              minLength: 2,
              maxLength: 50,
            }),
            fc.integer({ min: 1, max: 49 }), // snapshot position (not at end)
            (aggregateId, eventTemplates, snapshotIndexRaw) => {
              // Create events with correct aggregate ID
              const events = eventTemplates.map((e): TestEvent => {
                if (e.eventType === 'ValueSet') {
                  return new ValueSet(aggregateId, e.value, e.occurredAt);
                } else if (e.eventType === 'ValueAdded') {
                  return new ValueAdded(aggregateId, e.amount, e.occurredAt);
                } else {
                  return new ValueMultiplied(
                    aggregateId,
                    e.factor,
                    e.occurredAt,
                  );
                }
              });

              // Ensure snapshot index is within bounds
              const snapshotIndex = Math.min(
                snapshotIndexRaw,
                events.length - 1,
              );

              // Path 1: Full replay (baseline)
              const aggregateFullReplay = TestAggregate.forReplay(aggregateId);
              aggregateFullReplay.replayEvents(events);
              const fullReplayState = aggregateFullReplay.getStateSnapshot();

              // Path 2: Snapshot + partial replay
              // First, replay events up to snapshot point
              const aggregateForSnapshot = TestAggregate.forReplay(aggregateId);
              aggregateForSnapshot.replayEvents(events.slice(0, snapshotIndex));

              // Create snapshot at version N
              const snapshot = aggregateForSnapshot.createSnapshot();

              // Load from snapshot
              const aggregateFromSnapshot =
                TestAggregate.fromSnapshot(snapshot);

              // Replay remaining events (from N to M)
              const remainingEvents = events.slice(snapshotIndex);
              aggregateFromSnapshot.replayEvents(remainingEvents);

              const snapshotReplayState =
                aggregateFromSnapshot.getStateSnapshot();

              // States should be identical
              return (
                fullReplayState.value === snapshotReplayState.value &&
                fullReplayState.operationCount ===
                  snapshotReplayState.operationCount &&
                fullReplayState.version === snapshotReplayState.version
              );
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should produce identical state regardless of snapshot position', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(testEventArbitrary('placeholder'), {
              minLength: 10,
              maxLength: 30,
            }),
            (aggregateId, eventTemplates) => {
              // Create events with correct aggregate ID
              const events = eventTemplates.map((e): TestEvent => {
                if (e.eventType === 'ValueSet') {
                  return new ValueSet(aggregateId, e.value, e.occurredAt);
                } else if (e.eventType === 'ValueAdded') {
                  return new ValueAdded(aggregateId, e.amount, e.occurredAt);
                } else {
                  return new ValueMultiplied(
                    aggregateId,
                    e.factor,
                    e.occurredAt,
                  );
                }
              });

              // Full replay (baseline)
              const aggregateFullReplay = TestAggregate.forReplay(aggregateId);
              aggregateFullReplay.replayEvents(events);
              const fullReplayState = aggregateFullReplay.getStateSnapshot();

              // Test multiple snapshot positions
              const snapshotPositions = [
                Math.floor(events.length * 0.25),
                Math.floor(events.length * 0.5),
                Math.floor(events.length * 0.75),
              ];

              return snapshotPositions.every((snapshotIndex) => {
                // Replay up to snapshot point
                const aggregateForSnapshot =
                  TestAggregate.forReplay(aggregateId);
                aggregateForSnapshot.replayEvents(
                  events.slice(0, snapshotIndex),
                );

                // Create snapshot
                const snapshot = aggregateForSnapshot.createSnapshot();

                // Load from snapshot and replay remaining
                const aggregateFromSnapshot =
                  TestAggregate.fromSnapshot(snapshot);
                aggregateFromSnapshot.replayEvents(events.slice(snapshotIndex));

                const snapshotReplayState =
                  aggregateFromSnapshot.getStateSnapshot();

                // Should match full replay
                return (
                  fullReplayState.value === snapshotReplayState.value &&
                  fullReplayState.operationCount ===
                    snapshotReplayState.operationCount &&
                  fullReplayState.version === snapshotReplayState.version
                );
              });
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should maintain version consistency with snapshot + events', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(testEventArbitrary('placeholder'), {
              minLength: 2,
              maxLength: 40,
            }),
            fc.integer({ min: 1, max: 39 }),
            (aggregateId, eventTemplates, snapshotIndexRaw) => {
              // Create events with correct aggregate ID
              const events = eventTemplates.map((e): TestEvent => {
                if (e.eventType === 'ValueSet') {
                  return new ValueSet(aggregateId, e.value, e.occurredAt);
                } else if (e.eventType === 'ValueAdded') {
                  return new ValueAdded(aggregateId, e.amount, e.occurredAt);
                } else {
                  return new ValueMultiplied(
                    aggregateId,
                    e.factor,
                    e.occurredAt,
                  );
                }
              });

              const snapshotIndex = Math.min(
                snapshotIndexRaw,
                events.length - 1,
              );

              // Create snapshot at version N
              const aggregateForSnapshot = TestAggregate.forReplay(aggregateId);
              aggregateForSnapshot.replayEvents(events.slice(0, snapshotIndex));
              const snapshot = aggregateForSnapshot.createSnapshot();

              // Load from snapshot and replay remaining
              const aggregateFromSnapshot =
                TestAggregate.fromSnapshot(snapshot);
              const remainingEvents = events.slice(snapshotIndex);
              aggregateFromSnapshot.replayEvents(remainingEvents);

              // Version should equal total number of events
              return (
                aggregateFromSnapshot.version.value === events.length &&
                snapshot.version === snapshotIndex
              );
            },
          ),
          { numRuns: 100 },
        );
      });
    });
  });

  describe('Unit Tests', () => {
    describe('Snapshot creation and restoration', () => {
      it('should create snapshot with current state', () => {
        const aggregate = TestAggregate.create('test-1');
        aggregate.setValue(100);
        aggregate.addValue(50);
        aggregate.multiplyValue(2);

        const snapshot = aggregate.createSnapshot();

        expect(snapshot.aggregateId).toBe('test-1');
        expect(snapshot.aggregateType).toBe('TestAggregate');
        expect(snapshot.version).toBe(3);
        expect(snapshot.state.value).toBe(300); // (100 + 50) * 2
        expect(snapshot.state.operationCount).toBe(3);
      });

      it('should restore aggregate from snapshot', () => {
        const snapshot: Snapshot<TestAggregateState> = {
          aggregateId: 'test-1',
          aggregateType: 'TestAggregate',
          version: 5,
          state: {
            value: 42,
            operationCount: 5,
          },
          createdAt: new Date(),
        };

        const aggregate = TestAggregate.fromSnapshot(snapshot);

        expect(aggregate.value).toBe(42);
        expect(aggregate.operationCount).toBe(5);
        expect(aggregate.version.value).toBe(5);
      });

      it('should apply events after loading from snapshot', () => {
        const snapshot: Snapshot<TestAggregateState> = {
          aggregateId: 'test-1',
          aggregateType: 'TestAggregate',
          version: 2,
          state: {
            value: 10,
            operationCount: 2,
          },
          createdAt: new Date(),
        };

        const aggregate = TestAggregate.fromSnapshot(snapshot);
        aggregate.addValue(5);
        aggregate.multiplyValue(3);

        expect(aggregate.value).toBe(45); // (10 + 5) * 3
        expect(aggregate.operationCount).toBe(4); // 2 from snapshot + 2 new
        expect(aggregate.version.value).toBe(4); // 2 from snapshot + 2 new
      });
    });

    describe('Snapshot vs full replay equivalence', () => {
      it('should produce same state: snapshot at middle vs full replay', () => {
        const events: TestEvent[] = [
          new ValueSet('test-1', 10),
          new ValueAdded('test-1', 5),
          new ValueMultiplied('test-1', 2),
          new ValueAdded('test-1', 3),
          new ValueMultiplied('test-1', 4),
        ];

        // Full replay
        const aggregate1 = TestAggregate.forReplay('test-1');
        aggregate1.replayEvents(events);

        // Snapshot at version 3, then replay remaining
        const aggregate2 = TestAggregate.forReplay('test-1');
        aggregate2.replayEvents(events.slice(0, 3));
        const snapshot = aggregate2.createSnapshot();

        const aggregate3 = TestAggregate.fromSnapshot(snapshot);
        aggregate3.replayEvents(events.slice(3));

        expect(aggregate3.value).toBe(aggregate1.value);
        expect(aggregate3.operationCount).toBe(aggregate1.operationCount);
        expect(aggregate3.version.value).toBe(aggregate1.version.value);
      });

      it('should produce same state: snapshot at start vs full replay', () => {
        const events: TestEvent[] = [
          new ValueSet('test-1', 100),
          new ValueAdded('test-1', 50),
          new ValueMultiplied('test-1', 2),
        ];

        // Full replay
        const aggregate1 = TestAggregate.forReplay('test-1');
        aggregate1.replayEvents(events);

        // Snapshot at version 1, then replay remaining
        const aggregate2 = TestAggregate.forReplay('test-1');
        aggregate2.replayEvents(events.slice(0, 1));
        const snapshot = aggregate2.createSnapshot();

        const aggregate3 = TestAggregate.fromSnapshot(snapshot);
        aggregate3.replayEvents(events.slice(1));

        expect(aggregate3.value).toBe(aggregate1.value);
        expect(aggregate3.operationCount).toBe(aggregate1.operationCount);
        expect(aggregate3.version.value).toBe(aggregate1.version.value);
      });
    });
  });
});
