import { Module } from '@nestjs/common';
import { RetryService } from './infra/external/retry';
import { CircuitBreakerService } from './infra/external/circuit-breaker';
import { CredentialEncryptionService } from './infra/external/credential-encryption';
import { HashService } from './infra/external/hash';
import { EventPublisherService } from '@/shared/infra/events/event-publisher';

/**
 * IngestionSharedModule
 *
 * NestJS module for shared infrastructure services used across all ingestion sub-contexts.
 * Provides resilience patterns, encryption, hashing, and event publishing.
 *
 * Responsibilities:
 * - Retry logic with exponential backoff (IRetryService)
 * - Circuit breaker pattern (ICircuitBreaker)
 * - Credential encryption/decryption (ICredentialEncryption)
 * - Content hashing (IHashService)
 * - Event publishing (IEventPublisher)
 *
 * These services are shared across:
 * - Content sub-context (hashing, validation, event publishing)
 * - Job sub-context (retry, circuit breaker, event publishing)
 * - Source sub-context (credential encryption)
 *
 * Requirements: 2.4, 3.1, 5.5, 6.1, 6.4, 10.2, 10.3
 */
@Module({
  providers: [
    // Retry Service with Interface Token
    {
      provide: 'IRetryService',
      useClass: RetryService,
    },

    // Circuit Breaker with Interface Token and Factory
    {
      provide: 'ICircuitBreaker',
      useFactory: (): CircuitBreakerService => {
        return new CircuitBreakerService({
          failureThreshold: 5,
          successThreshold: 2,
          failureWindowMs: 60000,
          resetTimeoutMs: 30000,
        });
      },
    },

    // Credential Encryption with Interface Token
    {
      provide: 'ICredentialEncryption',
      useClass: CredentialEncryptionService,
    },

    // Hash Service with Interface Token
    {
      provide: 'IHashService',
      useClass: HashService,
    },

    // Event Publisher with Interface Token
    {
      provide: 'IEventPublisher',
      useClass: EventPublisherService,
    },
  ],
  exports: [
    // Export all service tokens for use in other modules
    'IRetryService',
    'ICircuitBreaker',
    'ICredentialEncryption',
    'IHashService',
    'IEventPublisher',
  ],
})
export class IngestionSharedModule {}
