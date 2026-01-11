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
 * - IRetryService: Executes operations with exponential backoff retry logic
 * - ICircuitBreaker: Prevents cascading failures by stopping requests to failing services
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
 *   @Inject('IRetryService')
 *   private readonly retryService: IRetryService,
 *   @Inject('ICircuitBreaker')
 *   private readonly circuitBreaker: ICircuitBreaker,
 * ) {}
 * ```
 */
@Module({
  providers: [
    // Retry Service with Interface Token
    {
      provide: 'IRetryService',
      useClass: RetryService,
    },
    // Circuit Breaker with Interface Token and default configuration
    {
      provide: 'ICircuitBreaker',
      useFactory: () => {
        return new CircuitBreakerService({
          failureThreshold: 5,
          successThreshold: 2,
          failureWindowMs: 60000,
          resetTimeoutMs: 30000,
        });
      },
    },
    // Also export concrete classes for backward compatibility
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
  exports: [
    'IRetryService',
    'ICircuitBreaker',
    RetryService,
    CircuitBreakerService,
  ],
})
export class ResilienceModule {}
