import { Module } from '@nestjs/common';
import { HashService } from './hash';
import { CredentialEncryptionService } from './credential-encryption';
import { EncryptionKeyProvider } from '../security/encryption-key-provider';

/**
 * SharedExternalModule
 *
 * NestJS module for shared external infrastructure services.
 * Provides cryptographic and other external service implementations
 * that are shared across all bounded contexts.
 *
 * Services:
 * - IHashService: SHA-256 cryptographic hashing
 * - ICredentialEncryption: AES-256-GCM credential encryption/decryption
 * - IEncryptionKeyProvider: Encryption key management
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
 * - 'ICredentialEncryption' → CredentialEncryptionService
 * - 'IEncryptionKeyProvider' → EncryptionKeyProvider
 */
@Module({
  providers: [
    // Hash Service with Interface Token
    {
      provide: 'IHashService',
      useClass: HashService,
    },
    // Credential Encryption with Interface Token
    {
      provide: 'ICredentialEncryption',
      useClass: CredentialEncryptionService,
    },
    // Encryption Key Provider with Interface Token
    {
      provide: 'IEncryptionKeyProvider',
      useClass: EncryptionKeyProvider,
    },
  ],
  exports: ['IHashService', 'ICredentialEncryption', 'IEncryptionKeyProvider'],
})
export class SharedExternalModule {}
