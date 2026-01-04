import { ValueObject } from '@/shared/kernel';

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

export class JobMetrics extends ValueObject<JobMetricsProps> {
  private constructor(props: JobMetricsProps) {
    super(props);
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
  protected validate(): void {
    if (this.props.itemsCollected < 0) {
      throw new Error('Items collected cannot be negative');
    }
    if (this.props.duplicatesDetected < 0) {
      throw new Error('Duplicates detected cannot be negative');
    }
    if (this.props.errorsEncountered < 0) {
      throw new Error('Errors encountered cannot be negative');
    }
    if (this.props.bytesProcessed < 0) {
      throw new Error('Bytes processed cannot be negative');
    }
    if (this.props.durationMs < 0) {
      throw new Error('Duration cannot be negative');
    }

    // Duplicates cannot exceed items collected
    if (this.props.duplicatesDetected > this.props.itemsCollected) {
      throw new Error('Duplicates detected cannot exceed items collected');
    }
  }

  /**
   * Calculates success rate (items collected - errors) / items collected
   */
  getSuccessRate(): number {
    if (this.props.itemsCollected === 0) {
      return 1.0; // No items means 100% success
    }
    const successfulItems =
      this.props.itemsCollected - this.props.errorsEncountered;
    return Math.max(0, successfulItems / this.props.itemsCollected);
  }

  /**
   * Calculates duplicate rate
   */
  getDuplicateRate(): number {
    if (this.props.itemsCollected === 0) {
      return 0;
    }
    return this.props.duplicatesDetected / this.props.itemsCollected;
  }

  /**
   * Calculates throughput (bytes per second)
   */
  getThroughput(): number {
    if (this.props.durationMs === 0) {
      return 0;
    }
    return (this.props.bytesProcessed / this.props.durationMs) * 1000;
  }

  // Getters
  get itemsCollected(): number {
    return this.props.itemsCollected;
  }

  get duplicatesDetected(): number {
    return this.props.duplicatesDetected;
  }

  get errorsEncountered(): number {
    return this.props.errorsEncountered;
  }

  get bytesProcessed(): number {
    return this.props.bytesProcessed;
  }

  get durationMs(): number {
    return this.props.durationMs;
  }
}
