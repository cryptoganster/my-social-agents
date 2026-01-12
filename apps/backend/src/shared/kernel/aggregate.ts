import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';
import { ValueObject } from './value-object';

/**
 * AggregateVersion Value Object
 *
 * Represents the version number of an aggregate for optimistic locking.
 * Ensures version numbers are always valid (non-negative integers).
 */
export interface AggregateVersionProps {
  value: number;
}

export class AggregateVersion extends ValueObject<AggregateVersionProps> {
  private constructor(value: number) {
    super({ value });
    this.validate();
  }

  protected validate(): void {
    if (!Number.isInteger(this.props.value)) {
      throw new Error('Version must be an integer');
    }

    if (this.props.value < 0) {
      throw new Error('Version cannot be negative');
    }
  }

  static initial(): AggregateVersion {
    return new AggregateVersion(0);
  }

  static fromNumber(value: number): AggregateVersion {
    return new AggregateVersion(value);
  }

  increment(): AggregateVersion {
    return new AggregateVersion(this.props.value + 1);
  }

  get value(): number {
    return this.props.value;
  }

  isInitial(): boolean {
    return this.props.value === 0;
  }

  isGreaterThan(other: AggregateVersion): boolean {
    return this.props.value > other.props.value;
  }

  isLessThan(other: AggregateVersion): boolean {
    return this.props.value < other.props.value;
  }

  toString(): string {
    return this.props.value.toString();
  }
}

// Re-export ConcurrencyException for backward compatibility
export { ConcurrencyException } from './concurrency-exception';

/**
 * AggregateRoot<TId>
 *
 * Abstract base class for Aggregate Roots in the domain layer.
 * Extends NestJS CQRS AggregateRoot for event sourcing capabilities.
 * Implements optimistic locking using AggregateVersion for concurrency control.
 *
 * @template TId - The type of the aggregate's unique identifier (usually string)
 *
 * ## Key Features
 *
 * - **Identity Management**: Unique, immutable identifier
 * - **Optimistic Locking**: Version-based concurrency control
 * - **Event Sourcing**: Apply and publish domain events (via NestJS CQRS)
 * - **Consistency Boundary**: Enforces business invariants
 *
 * ## Usage Example
 *
 * ```typescript
 * export class IngestionJob extends AggregateRoot<string> {
 *   private _status: IngestionStatus;
 *
 *   private constructor(id: string, version: AggregateVersion, status: IngestionStatus) {
 *     super(id, version);
 *     this._status = status;
 *   }
 *
 *   static create(id: string): IngestionJob {
 *     return new IngestionJob(id, AggregateVersion.initial(), IngestionStatus.pending());
 *   }
 *
 *   static reconstitute(id: string, version: number, status: IngestionStatus): IngestionJob {
 *     return new IngestionJob(id, AggregateVersion.fromNumber(version), status);
 *   }
 *
 *   start(): void {
 *     this._status = IngestionStatus.running();
 *     this.incrementVersion(); // CRITICAL: Always increment on state change
 *     this.apply(new JobStartedEvent(this.id)); // Optional: Domain event
 *   }
 * }
 * ```
 *
 * ## Optimistic Locking
 *
 * Prevents lost updates in concurrent scenarios:
 *
 * ```
 * Time    User A                          User B
 * ----    ------                          ------
 * T1      Load Job (v=1)                  Load Job (v=1)
 * T2      job.start() → v=2               job.fail() → v=2
 * T3      Save (v=1→2) ✓                  Save (v=1→2) ✗ ConcurrencyException!
 * ```
 *
 * ## Best Practices
 *
 * 1. **Always call `incrementVersion()`** in methods that modify state
 * 2. **Handle ConcurrencyException** with retry logic in use cases
 * 3. **Use private constructors** with static factory methods
 * 4. **Separate `create()` and `reconstitute()`** factory methods
 */
export abstract class AggregateRoot<TId = string> extends NestAggregateRoot {
  private readonly _id: TId;
  private _version: AggregateVersion;

  protected constructor(id: TId, version: AggregateVersion) {
    super();
    this._id = id;
    this._version = version;
  }

  get id(): TId {
    return this._id;
  }

  get version(): AggregateVersion {
    return this._version;
  }

  /**
   * Increments the version number.
   * MUST be called in every method that modifies aggregate state.
   */
  protected incrementVersion(): void {
    this._version = this._version.increment();
  }

  /**
   * Checks equality based on identity (ID), not value.
   */
  public equals(other: AggregateRoot<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (!(other instanceof AggregateRoot)) {
      return false;
    }

    return this._id === other._id;
  }
}
