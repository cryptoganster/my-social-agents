/**
 * ErrorRecord Entity
 *
 * Tracks individual errors during ingestion for troubleshooting and retry logic.
 * Unlike Value Objects, entities have identity and lifecycle.
 *
 * Requirements: 4.6, 6.5
 */

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorRecordProps {
  errorId: string;
  timestamp: Date;
  errorType: ErrorType;
  message: string;
  stackTrace?: string;
  retryCount: number;
}

export class ErrorRecord {
  private readonly _errorId: string;
  private readonly _timestamp: Date;
  private readonly _errorType: ErrorType;
  private readonly _message: string;
  private readonly _stackTrace?: string;
  private _retryCount: number;

  private constructor(props: ErrorRecordProps) {
    this._errorId = props.errorId;
    this._timestamp = props.timestamp;
    this._errorType = props.errorType;
    this._message = props.message;
    this._stackTrace = props.stackTrace;
    this._retryCount = props.retryCount;
  }

  /**
   * Creates a new ErrorRecord
   * Requirements: 4.6, 6.5
   */
  static create(
    props: Omit<ErrorRecordProps, 'errorId' | 'timestamp' | 'retryCount'>,
  ): ErrorRecord {
    return new ErrorRecord({
      errorId: ErrorRecord.generateId(),
      timestamp: new Date(),
      retryCount: 0,
      ...props,
    });
  }

  /**
   * Creates an ErrorRecord from an Error object
   */
  static fromError(
    error: Error,
    errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
  ): ErrorRecord {
    return ErrorRecord.create({
      errorType,
      message: error.message,
      stackTrace: error.stack,
    });
  }

  /**
   * Reconstitutes an ErrorRecord from persistence
   */
  static reconstitute(props: ErrorRecordProps): ErrorRecord {
    return new ErrorRecord(props);
  }

  /**
   * Generates a unique error ID
   */
  private static generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Increments the retry count
   */
  incrementRetryCount(): void {
    this._retryCount++;
  }

  /**
   * Checks if the error is retryable based on type
   */
  isRetryable(): boolean {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.TIMEOUT_ERROR,
    ];
    return retryableTypes.includes(this._errorType);
  }

  /**
   * Checks if max retries have been exceeded
   */
  hasExceededMaxRetries(maxRetries: number = 5): boolean {
    return this._retryCount >= maxRetries;
  }

  // Getters
  get errorId(): string {
    return this._errorId;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get errorType(): ErrorType {
    return this._errorType;
  }

  get message(): string {
    return this._message;
  }

  get stackTrace(): string | undefined {
    return this._stackTrace;
  }

  get retryCount(): number {
    return this._retryCount;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): ErrorRecordProps {
    return {
      errorId: this._errorId,
      timestamp: this._timestamp,
      errorType: this._errorType,
      message: this._message,
      stackTrace: this._stackTrace,
      retryCount: this._retryCount,
    };
  }

  /**
   * Returns a formatted error message for logging
   */
  toLogMessage(): string {
    const parts = [
      `[${this._errorType}]`,
      `Error ID: ${this._errorId}`,
      `Message: ${this._message}`,
      `Retry Count: ${this._retryCount}`,
      `Timestamp: ${this._timestamp.toISOString()}`,
    ];

    if (this._stackTrace !== undefined && this._stackTrace.length > 0) {
      parts.push(`Stack Trace:\n${this._stackTrace}`);
    }

    return parts.join('\n');
  }
}
