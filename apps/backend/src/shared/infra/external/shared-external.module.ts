import { Module } from '@nestjs/common';
import { HashService } from './hash';

/**
 * SharedExternalModule
 *
 * NestJS module for shared external infrastructure services.
 * Provides cryptographic and other external service implementations
 * that are shared across all bounded contexts.
 *
 * Services:
 * - IHashService: SHA-256 cryptographic hashing
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [SharedExternalModule],
 *   providers: [MyService],
 * })
 * export class MyModule {}
 * ```
 *
 * All services are registered with interface tokens for dependency injection:
 * - 'IHashService' → HashService
 */
@Module({
  providers: [
    // Hash Service with Interface Token
    {
      provide: 'IHashService',
      useClass: HashService,
    },
  ],
  exports: ['IHashService'],
})
export class SharedExternalModule {}
