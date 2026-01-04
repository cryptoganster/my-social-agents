/**
 * JobMetrics Value Object
 *
 * Statistics about ingestion job execution.
 * Immutable and self-validating.
 *
 * Requirements: 4.5
 */
export interface JobMetricsProps {
  itemsCollected: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  bytesProcessed: number;
  durationMs: number;
}

export class JobMetrics {
  private readonly _itemsCollected: number;
  private readonly _duplicatesDetected: number;
  private readonly _errorsEncountered: number;
  private readonly _bytesProcessed: number;
  private readonly _durationMs: number;

  private constructor(props: JobMetricsProps) {
    this._itemsCollected = props.itemsCollected;
    this._duplicatesDetected = props.duplicatesDetected;
    this._errorsEncountered = props.errorsEncountered;
    this._bytesProcessed = props.bytesProcessed;
    this._durationMs = props.durationMs;

    this.validate();
  }

  /**
   * Creates a JobMetrics instance
   */
  static create(props: JobMetricsProps): JobMetrics {
    return new JobMetrics(props);
  }

  /**
   * Creates an empty JobMetrics (all zeros)
   */
  static empty(): JobMetrics {
    return new JobMetrics({
      itemsCollected: 0,
      duplicatesDetected: 0,
      errorsEncountered: 0,
      bytesProcessed: 0,
      durationMs: 0,
    });
  }

  /**
   * Validates the metrics
   */
  private validate(): void {
    if (this._itemsCollected < 0) {
      throw new Error('Items collected cannot be negative');
    }
    if (this._duplicatesDetected < 0) {
      throw new Error('Duplicates detected cannot be negative');
    }
    if (this._errorsEncountered < 0) {
      throw new Error('Errors encountered cannot be negative');
    }
    if (this._bytesProcessed < 0) {
      throw new Error('Bytes processed cannot be negative');
    }
    if (this._durationMs < 0) {
      throw new Error('Duration cannot be negative');
    }

    // Duplicates cannot exceed items collected
    if (this._duplicatesDetected > this._itemsCollected) {
      throw new Error('Duplicates detected cannot exceed items collected');
    }
  }

  /**
   * Calculates success rate (items collected - errors) / items collected
   */
  getSuccessRate(): number {
    if (this._itemsCollected === 0) {
      return 1.0; // No items means 100% success
    }
    const successfulItems = this._itemsCollected - this._errorsEncountered;
    return Math.max(0, successfulItems / this._itemsCollected);
  }

  /**
   * Calculates duplicate rate
   */
  getDuplicateRate(): number {
    if (this._itemsCollected === 0) {
      return 0;
    }
    return this._duplicatesDetected / this._itemsCollected;
  }

  /**
   * Calculates throughput (bytes per second)
   */
  getThroughput(): number {
    if (this._durationMs === 0) {
      return 0;
    }
    return (this._bytesProcessed / this._durationMs) * 1000;
  }

  // Getters
  get itemsCollected(): number {
    return this._itemsCollected;
  }

  get duplicatesDetected(): number {
    return this._duplicatesDetected;
  }

  get errorsEncountered(): number {
    return this._errorsEncountered;
  }

  get bytesProcessed(): number {
    return this._bytesProcessed;
  }

  get durationMs(): number {
    return this._durationMs;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): JobMetricsProps {
    return {
      itemsCollected: this._itemsCollected,
      duplicatesDetected: this._duplicatesDetected,
      errorsEncountered: this._errorsEncountered,
      bytesProcessed: this._bytesProcessed,
      durationMs: this._durationMs,
    };
  }

  /**
   * Checks equality with another JobMetrics
   */
  equals(other: JobMetrics): boolean {
    return (
      this._itemsCollected === other._itemsCollected &&
      this._duplicatesDetected === other._duplicatesDetected &&
      this._errorsEncountered === other._errorsEncountered &&
      this._bytesProcessed === other._bytesProcessed &&
      this._durationMs === other._durationMs
    );
  }
}
