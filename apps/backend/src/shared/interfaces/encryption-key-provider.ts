/**
 * IEncryptionKeyProvider Interface
 *
 * Provides encryption keys for credential encryption.
 * Abstracts key management from consumers.
 *
 * This interface enables:
 * - Dependency Inversion: Consumers depend on abstraction, not implementation
 * - Flexibility: Can swap key sources (env vars, Vault, AWS Secrets Manager)
 * - Testability: Easy to mock in tests
 */
export interface IEncryptionKeyProvider {
  /**
   * Gets the encryption key for credentials
   * @returns The encryption key string
   */
  getKey(): string;
}
