/**
 * ICredentialEncryption Interface
 *
 * Interface for encrypting and decrypting sensitive credentials.
 * Used by domain services and use cases to handle API keys and passwords securely.
 *
 * Requirements: 5.5
 */
export interface ICredentialEncryption {
  /**
   * Encrypts a plaintext credential
   *
   * @param plaintext - The credential to encrypt
   * @param encryptionKey - The encryption key (should be stored securely, e.g., environment variable)
   * @returns Encrypted credential string
   * @throws Error if encryption fails
   */
  encrypt(plaintext: string, encryptionKey: string): string;

  /**
   * Decrypts an encrypted credential
   *
   * @param encrypted - The encrypted credential
   * @param encryptionKey - The encryption key used for encryption
   * @returns Decrypted plaintext credential
   * @throws Error if decryption fails or data is corrupted
   */
  decrypt(encrypted: string, encryptionKey: string): string;
}
