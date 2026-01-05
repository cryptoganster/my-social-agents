/**
 * Circuit breaker states
 */
export enum CircuitState {
  /**
   * Circuit is closed - requests flow normally
   */
  CLOSED = 'CLOSED',

  /**
   * Circuit is open - requests are blocked
   */
  OPEN = 'OPEN',

  /**
   * Circuit is half-open - testing if service recovered
   */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerOptions {
  /**
   * Number of failures before opening the circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Time window in milliseconds for counting failures
   * @default 60000 (60 seconds)
   */
  failureWindowMs?: number;

  /**
   * Time in milliseconds to wait before attempting recovery
   * @default 30000 (30 seconds)
   */
  resetTimeoutMs?: number;

  /**
   * Number of successful requests needed to close circuit from half-open
   * @default 2
   */
  successThreshold?: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  /**
   * Current state of the circuit
   */
  state: CircuitState;

  /**
   * Number of failures in current window
   */
  failureCount: number;

  /**
   * Number of successes in half-open state
   */
  successCount: number;

  /**
   * Timestamp when circuit was opened (if open)
   */
  openedAt?: Date;

  /**
   * Total number of requests blocked
   */
  totalRejected: number;
}

/**
 * ICircuitBreaker Interface
 *
 * Interface for implementing circuit breaker pattern.
 * Prevents cascading failures by stopping requests to failing services.
 *
 * Requirements: 6.4
 */
export interface ICircuitBreaker {
  /**
   * Executes an operation through the circuit breaker
   *
   * @param operation - Async function to execute
   * @returns Result of the operation
   * @throws Error if circuit is open or operation fails
   */
  execute<T>(operation: () => Promise<T>): Promise<T>;

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats;

  /**
   * Manually resets the circuit breaker to closed state
   */
  reset(): void;
}
