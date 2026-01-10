import { Injectable, Logger } from '@nestjs/common';
import { IEncryptionKeyProvider } from '@/shared/interfaces';

/**
 * EncryptionKeyProvider
 *
 * Provides encryption keys from environment variables.
 * In production, this could be extended to use AWS Secrets Manager,
 * HashiCorp Vault, or other secure key management systems.
 *
 * Single Responsibility: Manage encryption key retrieval
 */
@Injectable()
export class EncryptionKeyProvider implements IEncryptionKeyProvider {
  private readonly logger = new Logger(EncryptionKeyProvider.name);
  private readonly key: string;

  constructor() {
    this.key =
      process.env.CREDENTIAL_ENCRYPTION_KEY ??
      'default-key-for-development-only-min-32-chars';

    if (this.key === 'default-key-for-development-only-min-32-chars') {
      this.logger.warn(
        'Using default encryption key. Set CREDENTIAL_ENCRYPTION_KEY environment variable in production.',
      );
    }
  }

  getKey(): string {
    return this.key;
  }
}
