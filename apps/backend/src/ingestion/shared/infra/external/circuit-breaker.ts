import { Injectable } from '@nestjs/common';
import {
  ICircuitBreaker,
  CircuitBreakerOptions,
  CircuitBreakerStats,
  CircuitState,
} from '@/ingestion/shared/interfaces/external';

/**
 * CircuitBreakerService
 *
 * Concrete implementation of ICircuitBreaker interface.
 * Implements the circuit breaker pattern to prevent cascading failures.
 *
 * State Transitions:
 * - CLOSED → OPEN: When failure threshold is reached within time window
 * - OPEN → HALF_OPEN: After reset timeout expires
 * - HALF_OPEN → CLOSED: When success threshold is reached
 * - HALF_OPEN → OPEN: When any failure occurs
 *
 * Requirements: 6.4
 */
@Injectable()
export class CircuitBreakerService implements ICircuitBreaker {
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    failureWindowMs: 60000, // 60 seconds
    resetTimeoutMs: 30000, // 30 seconds
    successThreshold: 2,
  };

  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private openedAt?: Date;
  private totalRejected: number = 0;
  private failureTimestamps: number[] = [];
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Executes an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.totalRejected++;
        throw new Error(
          `Circuit breaker is OPEN. Opened at ${this.openedAt?.toISOString()}`,
        );
      }
    }

    try {
      // Execute the operation
      const result = await operation();

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure();

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Gets current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      openedAt: this.openedAt,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Manually resets the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = undefined;
    this.failureTimestamps = [];
  }

  /**
   * Handles successful operation execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      // If we've reached success threshold, close the circuit
      if (this.successCount >= this.options.successThreshold) {
        this.transitionToClosed();
      }
    }
    // In CLOSED state, success doesn't change anything
  }

  /**
   * Handles failed operation execution
   */
  private onFailure(): void {
    const now = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state reopens the circuit
      this.transitionToOpen();
      return;
    }

    if (this.state === CircuitState.CLOSED) {
      // Add failure timestamp
      this.failureTimestamps.push(now);

      // Remove old failures outside the time window
      this.cleanupOldFailures(now);

      // Update failure count
      this.failureCount = this.failureTimestamps.length;

      // Check if we should open the circuit
      if (this.failureCount >= this.options.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Removes failure timestamps outside the time window
   */
  private cleanupOldFailures(now: number): void {
    const cutoff = now - this.options.failureWindowMs;
    this.failureTimestamps = this.failureTimestamps.filter(
      (timestamp) => timestamp > cutoff,
    );
  }

  /**
   * Checks if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) {
      return false;
    }

    const now = Date.now();
    const openedTime = this.openedAt.getTime();
    const elapsed = now - openedTime;

    return elapsed >= this.options.resetTimeoutMs;
  }

  /**
   * Transitions circuit to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.openedAt = new Date();
    this.successCount = 0;
  }

  /**
   * Transitions circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
  }

  /**
   * Transitions circuit to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = undefined;
    this.failureTimestamps = [];
  }
}
