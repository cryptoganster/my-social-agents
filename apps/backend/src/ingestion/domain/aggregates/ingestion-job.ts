import {
  IngestionStatus,
  IngestionStatusEnum,
  JobMetrics,
} from '../value-objects';
import { SourceConfiguration } from './source-configuration';
import { ErrorRecord, ErrorType } from '../entities/error-record';
import { AggregateRoot, AggregateVersion } from '@/shared/kernel';

/**
 * IngestionJob Aggregate Root
 *
 * Manages the lifecycle of a content collection task.
 * Enforces business rules for job execution and tracks status, metrics, and errors.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

export interface IngestionJobProps {
  jobId: string;
  sourceConfig: SourceConfiguration;
  status: IngestionStatus;
  scheduledAt: Date;
  executedAt: Date | null;
  completedAt: Date | null;
  metrics: JobMetrics;
  errors: ErrorRecord[];
}

export class IngestionJob extends AggregateRoot<string> {
  private readonly _sourceConfig: SourceConfiguration;
  private _status: IngestionStatus;
  private readonly _scheduledAt: Date;
  private _executedAt: Date | null;
  private _completedAt: Date | null;
  private _metrics: JobMetrics;
  private _errors: ErrorRecord[];

  private constructor(
    id: string,
    version: AggregateVersion,
    props: Omit<IngestionJobProps, 'jobId'>,
  ) {
    super(id, version);
    this._sourceConfig = props.sourceConfig;
    this._status = props.status;
    this._scheduledAt = props.scheduledAt;
    this._executedAt = props.executedAt;
    this._completedAt = props.completedAt;
    this._metrics = props.metrics;
    this._errors = [...props.errors]; // Copy array
  }

  /**
   * Creates a new IngestionJob in PENDING state
   * New aggregates start at version 0
   * Requirements: 4.1, 4.2
   */
  static create(
    jobId: string,
    sourceConfig: SourceConfiguration,
    scheduledAt: Date = new Date(),
  ): IngestionJob {
    // Validate source configuration
    const validation = sourceConfig.validateConfig();
    if (!validation.isValid) {
      throw new Error(
        `Invalid source configuration: ${validation.errors.join(', ')}`,
      );
    }

    return new IngestionJob(jobId, AggregateVersion.initial(), {
      sourceConfig,
      status: IngestionStatus.pending(),
      scheduledAt,
      executedAt: null,
      completedAt: null,
      metrics: JobMetrics.empty(),
      errors: [],
    });
  }

  /**
   * Reconstitutes an IngestionJob from persistence
   * Loads existing version from database
   */
  static reconstitute(
    props: IngestionJobProps & { version: number },
  ): IngestionJob {
    return new IngestionJob(
      props.jobId,
      AggregateVersion.fromNumber(props.version),
      {
        sourceConfig: props.sourceConfig,
        status: props.status,
        scheduledAt: props.scheduledAt,
        executedAt: props.executedAt,
        completedAt: props.completedAt,
        metrics: props.metrics,
        errors: props.errors,
      },
    );
  }

  /**
   * Starts the job execution
   * Requirements: 4.3, 4.4
   */
  start(): void {
    if (!this._status.canTransitionTo(IngestionStatus.running())) {
      throw new Error(`Cannot start job in ${this._status.toString()} state`);
    }

    this._status = IngestionStatus.running();
    this._executedAt = new Date();
    this.incrementVersion(); // CRITICAL: Increment version on state change
  }

  /**
   * Completes the job with metrics
   * Requirements: 4.4, 4.5
   */
  complete(metrics: JobMetrics): void {
    if (!this._status.canTransitionTo(IngestionStatus.completed())) {
      throw new Error(
        `Cannot complete job in ${this._status.toString()} state`,
      );
    }

    this._status = IngestionStatus.completed();
    this._metrics = metrics;
    this._completedAt = new Date();
    this.incrementVersion(); // CRITICAL: Increment version on state change
  }

  /**
   * Marks the job as failed and records the error
   * Requirements: 4.4, 4.6
   */
  fail(error: ErrorRecord): void {
    if (!this._status.canTransitionTo(IngestionStatus.failed())) {
      throw new Error(`Cannot fail job in ${this._status.toString()} state`);
    }

    this._status = IngestionStatus.failed();
    this._errors.push(error);
    this._completedAt = new Date();
    this.incrementVersion(); // CRITICAL: Increment version on state change
  }

  /**
   * Transitions the job to retrying state
   * Requirements: 4.6, 6.1
   */
  retry(): void {
    if (!this._status.canTransitionTo(IngestionStatus.retrying())) {
      throw new Error(`Cannot retry job in ${this._status.toString()} state`);
    }

    this._status = IngestionStatus.retrying();
    this.incrementVersion(); // CRITICAL: Increment version on state change
  }

  /**
   * Checks if the job can be retried
   * Requirements: 4.6
   */
  canRetry(): boolean {
    // Can retry if:
    // 1. Job is in FAILED or RETRYING state
    // 2. Has not exceeded max retries (5)
    // 3. Last error is retryable
    const maxRetries = 5;
    const totalRetries = this._errors.reduce(
      (sum, error) => sum + error.retryCount,
      0,
    );

    if (totalRetries >= maxRetries) {
      return false;
    }

    const currentStatus = this._status.getValue();
    if (
      currentStatus === IngestionStatusEnum.FAILED ||
      currentStatus === IngestionStatusEnum.RETRYING
    ) {
      const lastError = this._errors[this._errors.length - 1];
      return lastError !== null && lastError !== undefined
        ? lastError.isRetryable()
        : false;
    }

    return false;
  }

  /**
   * Adds an error to the job without changing status
   * Used for non-fatal errors during execution
   */
  addError(error: ErrorRecord): void {
    this._errors.push(error);
    this.incrementVersion(); // CRITICAL: Increment version on state change
  }

  /**
   * Gets the most recent error
   */
  getLastError(): ErrorRecord | null {
    return this._errors.length > 0
      ? this._errors[this._errors.length - 1]
      : null;
  }

  /**
   * Gets all errors of a specific type
   */
  getErrorsByType(errorType: ErrorType): ErrorRecord[] {
    return this._errors.filter((error) => error.errorType === errorType);
  }

  /**
   * Checks if the job is overdue (scheduled time has passed and still pending)
   */
  isOverdue(): boolean {
    return (
      this._status.getValue() === IngestionStatusEnum.PENDING &&
      this._scheduledAt < new Date()
    );
  }

  /**
   * Calculates the job duration in milliseconds
   */
  getDuration(): number | null {
    if (!this._executedAt) {
      return null;
    }

    const endTime = this._completedAt || new Date();
    return endTime.getTime() - this._executedAt.getTime();
  }

  // Getters
  get jobId(): string {
    return this.id; // Use inherited id property
  }

  get sourceConfig(): SourceConfiguration {
    return this._sourceConfig;
  }

  get status(): IngestionStatus {
    return this._status;
  }

  get scheduledAt(): Date {
    return this._scheduledAt;
  }

  get executedAt(): Date | null {
    return this._executedAt;
  }

  get completedAt(): Date | null {
    return this._completedAt;
  }

  get metrics(): JobMetrics {
    return this._metrics;
  }

  get errors(): ErrorRecord[] {
    return [...this._errors]; // Return copy to prevent external mutation
  }

  /**
   * Returns a plain object representation
   */
  toObject(): IngestionJobProps & { version: number } {
    return {
      jobId: this.id,
      sourceConfig: this._sourceConfig,
      status: this._status,
      scheduledAt: this._scheduledAt,
      executedAt: this._executedAt,
      completedAt: this._completedAt,
      metrics: this._metrics,
      errors: [...this._errors],
      version: this.version.value,
    };
  }
}
