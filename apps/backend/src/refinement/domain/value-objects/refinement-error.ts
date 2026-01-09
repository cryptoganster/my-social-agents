import { ValueObject } from '@/shared/kernel';

/**
 * Properties for RefinementError Value Object
 */
export interface RefinementErrorProps {
  message: string;
  code: string;
  stackTrace?: string;
  occurredAt: Date;
}

/**
 * RefinementError Value Object
 *
 * Represents an error that occurred during content refinement.
 * Immutable value object that captures error details for debugging and monitoring.
 *
 * Error information:
 * - message: Human-readable error description
 * - code: Machine-readable error code for categorization
 * - stackTrace: Optional stack trace for debugging
 * - occurredAt: Timestamp when error occurred
 *
 * Error codes:
 * - CHUNKING_FAILED: Error during content chunking
 * - ENTITY_EXTRACTION_FAILED: Error during entity extraction
 * - TEMPORAL_ANALYSIS_FAILED: Error during temporal analysis
 * - QUALITY_ANALYSIS_FAILED: Error during quality analysis
 * - VALIDATION_FAILED: Content validation failed
 * - UNKNOWN_ERROR: Unclassified error
 *
 * Requirements: Refinement 1.4, 6.1, 6.2
 * Design: Value Objects section - RefinementError
 */
export class RefinementError extends ValueObject<RefinementErrorProps> {
  private constructor(props: RefinementErrorProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the error properties
   *
   * Invariants:
   * - message must be non-empty string
   * - code must be non-empty string
   * - occurredAt must be a valid Date
   * - stackTrace (if provided) must be a string
   */
  protected validate(): void {
    // Validate message
    if (
      typeof this.props.message !== 'string' ||
      this.props.message.trim().length === 0
    ) {
      throw new Error('Invalid message: must be a non-empty string');
    }

    // Validate code
    if (
      typeof this.props.code !== 'string' ||
      this.props.code.trim().length === 0
    ) {
      throw new Error('Invalid code: must be a non-empty string');
    }

    // Validate occurredAt
    if (!(this.props.occurredAt instanceof Date)) {
      throw new Error('Invalid occurredAt: must be a Date instance');
    }

    if (Number.isNaN(this.props.occurredAt.getTime())) {
      throw new Error('Invalid occurredAt: must be a valid Date');
    }

    // Validate stackTrace (if provided)
    if (
      this.props.stackTrace !== undefined &&
      typeof this.props.stackTrace !== 'string'
    ) {
      throw new Error('Invalid stackTrace: must be a string if provided');
    }
  }

  /**
   * Creates a RefinementError from error details
   *
   * @param message - Human-readable error description
   * @param code - Machine-readable error code
   * @param stackTrace - Optional stack trace for debugging
   * @param occurredAt - Timestamp when error occurred (defaults to now)
   * @returns A new RefinementError instance
   * @throws Error if any value is invalid
   */
  static create(
    message: string,
    code: string,
    stackTrace?: string,
    occurredAt?: Date,
  ): RefinementError {
    return new RefinementError({
      message,
      code,
      stackTrace,
      occurredAt: occurredAt || new Date(),
    });
  }

  /**
   * Creates a RefinementError from a JavaScript Error object
   *
   * @param error - The Error object to convert
   * @param code - Machine-readable error code (defaults to 'UNKNOWN_ERROR')
   * @returns A new RefinementError instance
   */
  static fromException(error: Error, code?: string): RefinementError {
    return new RefinementError({
      message: error.message,
      code: code || 'UNKNOWN_ERROR',
      stackTrace: error.stack,
      occurredAt: new Date(),
    });
  }

  /**
   * Creates a RefinementError for chunking failures
   *
   * @param message - Error description
   * @param stackTrace - Optional stack trace
   * @returns A new RefinementError instance with CHUNKING_FAILED code
   */
  static chunkingFailed(message: string, stackTrace?: string): RefinementError {
    return RefinementError.create(message, 'CHUNKING_FAILED', stackTrace);
  }

  /**
   * Creates a RefinementError for entity extraction failures
   *
   * @param message - Error description
   * @param stackTrace - Optional stack trace
   * @returns A new RefinementError instance with ENTITY_EXTRACTION_FAILED code
   */
  static entityExtractionFailed(
    message: string,
    stackTrace?: string,
  ): RefinementError {
    return RefinementError.create(
      message,
      'ENTITY_EXTRACTION_FAILED',
      stackTrace,
    );
  }

  /**
   * Creates a RefinementError for temporal analysis failures
   *
   * @param message - Error description
   * @param stackTrace - Optional stack trace
   * @returns A new RefinementError instance with TEMPORAL_ANALYSIS_FAILED code
   */
  static temporalAnalysisFailed(
    message: string,
    stackTrace?: string,
  ): RefinementError {
    return RefinementError.create(
      message,
      'TEMPORAL_ANALYSIS_FAILED',
      stackTrace,
    );
  }

  /**
   * Creates a RefinementError for quality analysis failures
   *
   * @param message - Error description
   * @param stackTrace - Optional stack trace
   * @returns A new RefinementError instance with QUALITY_ANALYSIS_FAILED code
   */
  static qualityAnalysisFailed(
    message: string,
    stackTrace?: string,
  ): RefinementError {
    return RefinementError.create(
      message,
      'QUALITY_ANALYSIS_FAILED',
      stackTrace,
    );
  }

  /**
   * Creates a RefinementError for validation failures
   *
   * @param message - Error description
   * @param stackTrace - Optional stack trace
   * @returns A new RefinementError instance with VALIDATION_FAILED code
   */
  static validationFailed(
    message: string,
    stackTrace?: string,
  ): RefinementError {
    return RefinementError.create(message, 'VALIDATION_FAILED', stackTrace);
  }

  /**
   * Gets the error message
   */
  get message(): string {
    return this.props.message;
  }

  /**
   * Gets the error code
   */
  get code(): string {
    return this.props.code;
  }

  /**
   * Gets the stack trace (if available)
   */
  get stackTrace(): string | undefined {
    return this.props.stackTrace;
  }

  /**
   * Gets the timestamp when error occurred
   */
  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  /**
   * Checks if this error has a stack trace
   */
  get hasStackTrace(): boolean {
    return this.props.stackTrace !== undefined;
  }

  /**
   * Returns a string representation of the error
   */
  toString(): string {
    const timestamp = this.props.occurredAt.toISOString();
    const stack = this.props.stackTrace ? '\n' + this.props.stackTrace : '';
    return `[${this.props.code}] ${this.props.message} (at ${timestamp})${stack}`;
  }
}
