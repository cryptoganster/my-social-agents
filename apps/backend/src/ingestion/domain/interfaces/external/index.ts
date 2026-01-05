/**
 * External Service Interfaces
 *
 * Interfaces for external dependencies that the domain layer needs.
 * Implementations live in the infrastructure layer.
 */
export type { IHashService } from './hash';
export type { ICredentialEncryption } from './credential-encryption';
export type { IJobScheduler, JobCallback } from './job-scheduler';
export type { IRetryService, RetryOptions, RetryResult } from './retry';
export type {
  ICircuitBreaker,
  CircuitBreakerOptions,
  CircuitBreakerStats,
} from './circuit-breaker';
export { CircuitState } from './circuit-breaker';
