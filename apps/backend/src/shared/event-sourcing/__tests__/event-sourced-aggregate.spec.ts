import * as fc from 'fast-check';
import { EventSourcedAggregate } from '../event-sourced-aggregate';
import { DomainEvent } from '../event-store';
import { AggregateVersion } from '../../kernel';

/**
 * Test Domain Events for property testing
 */
class CounterIncremented implements DomainEvent {
  readonly eventType = 'CounterIncremented';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

class CounterDecremented implements DomainEvent {
  readonly eventType = 'CounterDecremented';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

class CounterReset implements DomainEvent {
  readonly eventType = 'CounterReset';
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date();
  }
}

type CounterEvent = CounterIncremented | CounterDecremented | CounterReset;

/**
 * Test Aggregate for property testing
 *
 * A simple counter aggregate that tracks a value through events.
 * Used to verify deterministic replay properties.
 */
class CounterAggregate extends EventSourcedAggregate<string> {
  private _value: number = 0;
  private _incrementCount: number = 0;
  private _decrementCount: number = 0;
  private _resetCount: number = 0;

  private constructor(id: string, version: AggregateVersion) {
    super(id, version);
  }

  /**
   * Creates a new counter aggregate
   */
  static create(id: string): CounterAggregate {
    return new CounterAggregate(id, AggregateVersion.initial());
  }

  /**
   * Creates an aggregate for replay (no initial state)
   */
  static forReplay(id: string): CounterAggregate {
    return new CounterAggregate(id, AggregateVersion.initial());
  }

  protected applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'CounterIncremented':
        this.applyCounterIncremented(event as CounterIncremented);
        break;
      case 'CounterDecremented':
        this.applyCounterDecremented(event as CounterDecremented);
        break;
      case 'CounterReset':
        this.applyCounterReset();
        break;
      default:
        throw new Error(`Unknown event type: ${event.eventType}`);
    }
  }

  private applyCounterIncremented(event: CounterIncremented): void {
    this._value += event.amount;
    this._incrementCount++;
  }

  private applyCounterDecremented(event: CounterDecremented): void {
    this._value -= event.amount;
    this._decrementCount++;
  }

  private applyCounterReset(): void {
    this._value = 0;
    this._resetCount++;
  }

  // Business methods that raise events
  increment(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    this.raise(new CounterIncremented(this.id, amount));
  }

  decrement(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    this.raise(new CounterDecremented(this.id, amount));
  }

  reset(): void {
    this.raise(new CounterReset(this.id));
  }

  // Getters for state verification
  get value(): number {
    return this._value;
  }

  get incrementCount(): number {
    return this._incrementCount;
  }

  get decrementCount(): number {
    return this._decrementCount;
  }

  get resetCount(): number {
    return this._resetCount;
  }

  /**
   * Returns state snapshot for comparison
   */
  getStateSnapshot(): {
    value: number;
    incrementCount: number;
    decrementCount: number;
    resetCount: number;
    version: number;
  } {
    return {
      value: this._value,
      incrementCount: this._incrementCount,
      decrementCount: this._decrementCount,
      resetCount: this._resetCount,
      version: this.version.value,
    };
  }
}

/**
 * Arbitrary for generating random counter events
 */
const counterEventArbitrary = (
  aggregateId: string,
): fc.Arbitrary<CounterEvent> =>
  fc
    .oneof(
      fc.record({
        type: fc.constant('increment' as const),
        amount: fc.integer({ min: 1, max: 1000 }),
      }),
      fc.record({
        type: fc.constant('decrement' as const),
        amount: fc.integer({ min: 1, max: 1000 }),
      }),
      fc.record({
        type: fc.constant('reset' as const),
      }),
    )
    .map((spec) => {
      const now = new Date();
      switch (spec.type) {
        case 'increment':
          return new CounterIncremented(aggregateId, spec.amount, now);
        case 'decrement':
          return new CounterDecremented(aggregateId, spec.amount, now);
        case 'reset':
          return new CounterReset(aggregateId, now);
      }
    });

describe('EventSourcedAggregate', () => {
  describe('Property-Based Tests', () => {
    /**
     * Feature: event-sourcing-upgrade, Property 2: Deterministic Replay (Round-Trip)
     *
     * For any valid aggregate and any sequence of domain actions,
     * saving the aggregate to the Event Store and then loading it back
     * SHALL produce an aggregate with equivalent state.
     *
     * Validates: Requirements 2.1, 2.6
     */
    describe('Property 2: Deterministic Replay (Round-Trip)', () => {
      it('should produce identical state when replaying the same events', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(fc.integer({ min: 1, max: 100 }), {
              minLength: 1,
              maxLength: 50,
            }),
            (aggregateId, eventSpecs) => {
              // Create aggregate and apply events through business methods
              const aggregate1 = CounterAggregate.create(aggregateId);
              const events: DomainEvent[] = [];

              for (const spec of eventSpecs) {
                const eventType = spec % 3;
                if (eventType === 0) {
                  aggregate1.increment(Math.abs(spec) + 1);
                } else if (eventType === 1) {
                  aggregate1.decrement(Math.abs(spec) + 1);
                } else {
                  aggregate1.reset();
                }
              }

              // Get uncommitted events (simulating save)
              events.push(...aggregate1.getUncommittedEvents());

              // Create new aggregate and replay events (simulating load)
              const aggregate2 = CounterAggregate.forReplay(aggregateId);
              aggregate2.replayEvents(events);

              // States should be identical
              const state1 = aggregate1.getStateSnapshot();
              const state2 = aggregate2.getStateSnapshot();

              return (
                state1.value === state2.value &&
                state1.incrementCount === state2.incrementCount &&
                state1.decrementCount === state2.decrementCount &&
                state1.resetCount === state2.resetCount &&
                state1.version === state2.version
              );
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should produce identical state regardless of when events are replayed', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(counterEventArbitrary('placeholder'), {
              minLength: 1,
              maxLength: 30,
            }),
            (aggregateId, eventTemplates) => {
              // Create events with correct aggregate ID
              const events = eventTemplates.map((e): CounterEvent => {
                if (e.eventType === 'CounterIncremented') {
                  return new CounterIncremented(
                    aggregateId,
                    e.amount,
                    e.occurredAt,
                  );
                } else if (e.eventType === 'CounterDecremented') {
                  return new CounterDecremented(
                    aggregateId,
                    e.amount,
                    e.occurredAt,
                  );
                } else {
                  return new CounterReset(aggregateId, e.occurredAt);
                }
              });

              // Replay all events at once
              const aggregate1 = CounterAggregate.forReplay(aggregateId);
              aggregate1.replayEvents(events);

              // Replay events one by one
              const aggregate2 = CounterAggregate.forReplay(aggregateId);
              for (const event of events) {
                aggregate2.replayEvents([event]);
              }

              // States should be identical
              const state1 = aggregate1.getStateSnapshot();
              const state2 = aggregate2.getStateSnapshot();

              return (
                state1.value === state2.value &&
                state1.incrementCount === state2.incrementCount &&
                state1.decrementCount === state2.decrementCount &&
                state1.resetCount === state2.resetCount &&
                state1.version === state2.version
              );
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should maintain version consistency with event count', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(counterEventArbitrary('placeholder'), {
              minLength: 0,
              maxLength: 50,
            }),
            (aggregateId, eventTemplates) => {
              // Create events with correct aggregate ID
              const events = eventTemplates.map((e): CounterEvent => {
                if (e.eventType === 'CounterIncremented') {
                  return new CounterIncremented(
                    aggregateId,
                    e.amount,
                    e.occurredAt,
                  );
                } else if (e.eventType === 'CounterDecremented') {
                  return new CounterDecremented(
                    aggregateId,
                    e.amount,
                    e.occurredAt,
                  );
                } else {
                  return new CounterReset(aggregateId, e.occurredAt);
                }
              });

              const aggregate = CounterAggregate.forReplay(aggregateId);
              aggregate.replayEvents(events);

              // Version should equal number of events replayed
              return aggregate.version.value === events.length;
            },
          ),
          { numRuns: 100 },
        );
      });
    });
  });

  describe('Unit Tests', () => {
    describe('Event raising and uncommitted events', () => {
      it('should track uncommitted events after business operations', () => {
        const aggregate = CounterAggregate.create('test-1');

        aggregate.increment(5);
        aggregate.decrement(2);
        aggregate.reset();

        const uncommitted = aggregate.getUncommittedEvents();
        expect(uncommitted).toHaveLength(3);
        expect(uncommitted[0].eventType).toBe('CounterIncremented');
        expect(uncommitted[1].eventType).toBe('CounterDecremented');
        expect(uncommitted[2].eventType).toBe('CounterReset');
      });

      it('should clear uncommitted events', () => {
        const aggregate = CounterAggregate.create('test-1');

        aggregate.increment(5);
        expect(aggregate.hasUncommittedEvents()).toBe(true);

        aggregate.clearUncommittedEvents();
        expect(aggregate.hasUncommittedEvents()).toBe(false);
        expect(aggregate.getUncommittedEvents()).toHaveLength(0);
      });

      it('should return copy of uncommitted events', () => {
        const aggregate = CounterAggregate.create('test-1');
        aggregate.increment(5);

        const events1 = aggregate.getUncommittedEvents();
        const events2 = aggregate.getUncommittedEvents();

        expect(events1).not.toBe(events2);
        expect(events1).toEqual(events2);
      });
    });

    describe('State after replay', () => {
      it('should correctly calculate value after mixed operations', () => {
        const aggregate = CounterAggregate.create('test-1');

        aggregate.increment(10);
        aggregate.increment(5);
        aggregate.decrement(3);
        aggregate.reset();
        aggregate.increment(7);

        expect(aggregate.value).toBe(7);
        expect(aggregate.incrementCount).toBe(3);
        expect(aggregate.decrementCount).toBe(1);
        expect(aggregate.resetCount).toBe(1);
      });

      it('should replay events to same state', () => {
        const aggregate1 = CounterAggregate.create('test-1');
        aggregate1.increment(10);
        aggregate1.decrement(3);
        aggregate1.increment(5);

        const events = aggregate1.getUncommittedEvents();

        const aggregate2 = CounterAggregate.forReplay('test-1');
        aggregate2.replayEvents(events);

        expect(aggregate2.value).toBe(aggregate1.value);
        expect(aggregate2.version.value).toBe(aggregate1.version.value);
      });
    });

    describe('Version tracking', () => {
      it('should start at version 0', () => {
        const aggregate = CounterAggregate.create('test-1');
        expect(aggregate.version.value).toBe(0);
      });

      it('should increment version with each event', () => {
        const aggregate = CounterAggregate.create('test-1');

        aggregate.increment(1);
        expect(aggregate.version.value).toBe(1);

        aggregate.decrement(1);
        expect(aggregate.version.value).toBe(2);

        aggregate.reset();
        expect(aggregate.version.value).toBe(3);
      });
    });

    describe('Error handling', () => {
      it('should throw on unknown event type during replay', () => {
        const aggregate = CounterAggregate.forReplay('test-1');
        const unknownEvent = {
          eventType: 'UnknownEvent',
          aggregateId: 'test-1',
          occurredAt: new Date(),
        } as DomainEvent;

        expect(() => aggregate.replayEvents([unknownEvent])).toThrow(
          'Unknown event type: UnknownEvent',
        );
      });

      it('should throw on invalid increment amount', () => {
        const aggregate = CounterAggregate.create('test-1');
        expect(() => aggregate.increment(0)).toThrow('Amount must be positive');
        expect(() => aggregate.increment(-5)).toThrow(
          'Amount must be positive',
        );
      });

      it('should throw on invalid decrement amount', () => {
        const aggregate = CounterAggregate.create('test-1');
        expect(() => aggregate.decrement(0)).toThrow('Amount must be positive');
        expect(() => aggregate.decrement(-5)).toThrow(
          'Amount must be positive',
        );
      });
    });
  });
});
