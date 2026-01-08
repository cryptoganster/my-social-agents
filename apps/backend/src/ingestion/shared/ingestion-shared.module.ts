import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared/shared.module';
import { CircuitBreakerService, RetryService } from '@/shared/infra/resilience';
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
  imports: [SharedModule],
  providers: [
    // Retry Service with Interface Token
    {
      provide: 'IRetryService',
      useClass: RetryService,
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

    // Circuit Breaker with Interface Token and Factory (per-instance configuration)
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
  ],
  exports: [
    // Export SharedModule services (RetryService, CircuitBreakerService, ScheduleModule)
    SharedModule,
    // Export ingestion-specific services with interface tokens
    'IRetryService',
    'ICredentialEncryption',
    'IHashService',
    'IEventPublisher',
    'ICircuitBreaker',
  ],
})
export class IngestionSharedModule {}
