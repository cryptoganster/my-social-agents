import { ValueObject } from '@/shared/kernel';

/**
 * Properties for TemporalContext Value Object
 */
export interface TemporalContextProps {
  publishedAt: Date;
  eventTimestamp: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
}

/**
 * TemporalContext Value Object
 *
 * Represents time-related information extracted from content.
 * Immutable value object that captures publication date, event timestamp,
 * and optional temporal windows for time-based queries.
 *
 * Requirements: Refinement 4.1, 4.2, 4.4, 4.5
 * Design: Value Objects section - TemporalContext
 */
export class TemporalContext extends ValueObject<TemporalContextProps> {
  private constructor(props: TemporalContextProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the temporal context properties
   *
   * Invariants:
   * - publishedAt must be a valid date
   * - If eventTimestamp exists, must be a valid date
   * - If window exists, windowStart < windowEnd
   * - All dates must be in the past or present (not future)
   */
  protected validate(): void {
    // Validate publishedAt
    if (
      !(this.props.publishedAt instanceof Date) ||
      isNaN(this.props.publishedAt.getTime())
    ) {
      throw new Error('Invalid publishedAt: must be a valid date');
    }

    // Validate eventTimestamp if provided
    if (this.props.eventTimestamp !== null) {
      if (
        !(this.props.eventTimestamp instanceof Date) ||
        isNaN(this.props.eventTimestamp.getTime())
      ) {
        throw new Error('Invalid eventTimestamp: must be a valid date or null');
      }
    }

    // Validate temporal window if provided
    const hasWindowStart = this.props.windowStart !== null;
    const hasWindowEnd = this.props.windowEnd !== null;

    if (hasWindowStart && hasWindowEnd) {
      if (
        !(this.props.windowStart instanceof Date) ||
        isNaN(this.props.windowStart.getTime())
      ) {
        throw new Error('Invalid windowStart: must be a valid date');
      }

      if (
        !(this.props.windowEnd instanceof Date) ||
        isNaN(this.props.windowEnd.getTime())
      ) {
        throw new Error('Invalid windowEnd: must be a valid date');
      }

      if (this.props.windowStart >= this.props.windowEnd) {
        throw new Error(
          'Invalid temporal window: windowStart must be before windowEnd',
        );
      }
    } else if (hasWindowStart || hasWindowEnd) {
      throw new Error(
        'Invalid temporal window: both windowStart and windowEnd must be provided together',
      );
    }
  }

  /**
   * Creates a TemporalContext with publication date and optional event timestamp
   *
   * @param publishedAt - Content publication date
   * @param eventTimestamp - Primary event date (optional)
   * @returns A new TemporalContext instance
   */
  static create(publishedAt: Date, eventTimestamp?: Date): TemporalContext {
    return new TemporalContext({
      publishedAt,
      eventTimestamp: eventTimestamp ?? null,
      windowStart: null,
      windowEnd: null,
    });
  }

  /**
   * Creates a TemporalContext with a temporal window
   *
   * @param publishedAt - Content publication date
   * @param windowStart - Temporal window start date
   * @param windowEnd - Temporal window end date
   * @param eventTimestamp - Primary event date (optional)
   * @returns A new TemporalContext instance
   */
  static withWindow(
    publishedAt: Date,
    windowStart: Date,
    windowEnd: Date,
    eventTimestamp?: Date,
  ): TemporalContext {
    return new TemporalContext({
      publishedAt,
      eventTimestamp: eventTimestamp ?? null,
      windowStart,
      windowEnd,
    });
  }

  /**
   * Gets the publication date
   */
  get publishedAt(): Date {
    return this.props.publishedAt;
  }

  /**
   * Gets the event timestamp (if available)
   */
  get eventTimestamp(): Date | null {
    return this.props.eventTimestamp;
  }

  /**
   * Gets the temporal window start (if available)
   */
  get windowStart(): Date | null {
    return this.props.windowStart;
  }

  /**
   * Gets the temporal window end (if available)
   */
  get windowEnd(): Date | null {
    return this.props.windowEnd;
  }

  /**
   * Checks if the content is historical (event happened before publication)
   *
   * @returns true if eventTimestamp exists and is before publishedAt
   */
  get isHistorical(): boolean {
    if (this.props.eventTimestamp === null) {
      return false;
    }
    return this.props.eventTimestamp < this.props.publishedAt;
  }

  /**
   * Checks if the content is predictive (event happens after publication)
   *
   * @returns true if eventTimestamp exists and is after publishedAt
   */
  get isPredictive(): boolean {
    if (this.props.eventTimestamp === null) {
      return false;
    }
    return this.props.eventTimestamp > this.props.publishedAt;
  }

  /**
   * Checks if a temporal window is defined
   *
   * @returns true if both windowStart and windowEnd are defined
   */
  get hasWindow(): boolean {
    return this.props.windowStart !== null && this.props.windowEnd !== null;
  }

  /**
   * Returns a string representation of the temporal context
   */
  toString(): string {
    const parts: string[] = [
      `published:${this.props.publishedAt.toISOString()}`,
    ];

    if (this.props.eventTimestamp) {
      parts.push(`event:${this.props.eventTimestamp.toISOString()}`);
    }

    if (this.hasWindow) {
      parts.push(
        `window:[${this.props.windowStart!.toISOString()},${this.props.windowEnd!.toISOString()}]`,
      );
    }

    return parts.join(' ');
  }
}
