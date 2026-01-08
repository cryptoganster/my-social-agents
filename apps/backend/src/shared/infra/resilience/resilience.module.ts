import { Module } from '@nestjs/common';
import { RetryService } from './retry';
import { CircuitBreakerService } from './circuit-breaker';

/**
 * ResilienceModule
 *
 * Provides shared resilience services for handling transient failures
 * and preventing cascading failures across all bounded contexts.
 *
 * Services:
 * - RetryService: Executes operations with exponential backoff retry logic
 * - CircuitBreakerService: Prevents cascading failures by stopping requests to failing services
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [ResilienceModule],
 *   providers: [MyService],
 * })
 * export class MyModule {}
 * ```
 *
 * Then inject services in your classes:
 * ```typescript
 * constructor(
 *   private readonly retryService: RetryService,
 *   private readonly circuitBreaker: CircuitBreakerService,
 * ) {}
 * ```
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.4
 */
@Module({
  providers: [
    RetryService,
    {
      provide: CircuitBreakerService,
      useFactory: () => {
        return new CircuitBreakerService({
          failureThreshold: 5,
          successThreshold: 2,
          failureWindowMs: 60000,
          resetTimeoutMs: 30000,
        });
      },
    },
  ],
  exports: [RetryService, CircuitBreakerService],
})
export class ResilienceModule {}
