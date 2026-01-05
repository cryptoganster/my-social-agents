/**
 * Retry configuration options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 5
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000 (1 second)
   */
  initialDelayMs?: number;

  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay in milliseconds between retries
   * @default 60000 (60 seconds)
   */
  maxDelayMs?: number;

  /**
   * Whether to add random jitter to delays
   * Helps prevent thundering herd problem
   * @default true
   */
  useJitter?: boolean;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Result value if successful
   */
  value?: T;

  /**
   * Error if all retries failed
   */
  error?: Error;

  /**
   * Number of attempts made
   */
  attempts: number;

  /**
   * Total time spent retrying in milliseconds
   */
  totalTimeMs: number;
}

/**
 * IRetryService Interface
 *
 * Interface for executing operations with exponential backoff retry logic.
 * Used for handling transient failures (network errors, temporary unavailability).
 *
 * Requirements: 6.1, 10.3
 */
export interface IRetryService {
  /**
   * Executes an operation with retry logic
   *
   * @param operation - Async function to execute
   * @param options - Retry configuration options
   * @returns Result of the operation with retry metadata
   */
  execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<RetryResult<T>>;

  /**
   * Calculates the delay for a given attempt number
   * Useful for testing and debugging
   *
   * @param attempt - Attempt number (0-based)
   * @param options - Retry configuration options
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number, options?: RetryOptions): number;
}
