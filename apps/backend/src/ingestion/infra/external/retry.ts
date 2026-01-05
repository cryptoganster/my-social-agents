import { Injectable } from '@nestjs/common';
import {
  IRetryService,
  RetryOptions,
  RetryResult,
} from '@/ingestion/domain/interfaces/external';

/**
 * RetryService
 *
 * Concrete implementation of IRetryService interface.
 * Provides exponential backoff retry logic for handling transient failures.
 *
 * Features:
 * - Exponential backoff with configurable multiplier
 * - Maximum delay cap to prevent excessive waiting
 * - Optional jitter to prevent thundering herd
 * - Detailed retry metadata in results
 *
 * Requirements: 6.1, 10.3
 */
@Injectable()
export class RetryService implements IRetryService {
  private readonly defaultOptions: Required<RetryOptions> = {
    maxAttempts: 5,
    initialDelayMs: 1000, // 1 second
    backoffMultiplier: 2,
    maxDelayMs: 60000, // 60 seconds
    useJitter: true,
  };

  /**
   * Executes an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
      try {
        // Execute the operation
        const value = await operation();

        // Success!
        return {
          success: true,
          value,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this was the last attempt, don't wait
        if (attempt === opts.maxAttempts - 1) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, opts);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError,
      attempts: opts.maxAttempts,
      totalTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Calculates the delay for a given attempt number
   */
  calculateDelay(attempt: number, options?: RetryOptions): number {
    const opts = { ...this.defaultOptions, ...options };

    // Calculate exponential backoff: initialDelay * (multiplier ^ attempt)
    let delay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt);

    // Cap at maximum delay
    delay = Math.min(delay, opts.maxDelayMs);

    // Add jitter if enabled (random value between 0 and delay)
    if (opts.useJitter) {
      delay = Math.random() * delay;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
