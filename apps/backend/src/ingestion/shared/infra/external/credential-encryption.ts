import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { ICredentialEncryption } from '@/ingestion/shared/domain/interfaces/external/credential-encryption';

/**
 * CredentialEncryptionService
 *
 * Concrete implementation of ICredentialEncryption interface using Node.js crypto.
 * Encrypts credentials using AES-256-GCM with scrypt key derivation.
 *
 * Format: salt:iv:authTag:ciphertext (all base64 encoded)
 *
 * Requirements: 5.5
 */
@Injectable()
export class CredentialEncryptionService implements ICredentialEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32;
  private readonly tagLength = 16;

  /**
   * Encrypts a plaintext credential using AES-256-GCM
   *
   * @param plaintext - The credential to encrypt
   * @param encryptionKey - The encryption key (should be at least 32 characters)
   * @returns Encrypted string in format: salt:iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string, encryptionKey: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty plaintext');
    }

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }

    // Generate random salt and IV
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // Derive key from encryption key using scrypt
    const key = scryptSync(encryptionKey, salt, this.keyLength);

    // Create cipher
    const cipher = createCipheriv(this.algorithm, key, iv);

    // Encrypt
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: salt:iv:authTag:ciphertext
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext,
    ].join(':');
  }

  /**
   * Decrypts an encrypted credential
   *
   * @param encrypted - Encrypted string in format: salt:iv:authTag:ciphertext
   * @param encryptionKey - The encryption key used for encryption
   * @returns Decrypted plaintext
   */
  decrypt(encrypted: string, encryptionKey: string): string {
    if (!encrypted) {
      throw new Error('Cannot decrypt empty string');
    }

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }

    // Parse encrypted string
    const parts = encrypted.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted format');
    }

    const [saltB64, ivB64, authTagB64, ciphertext] = parts;

    // Decode from base64
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    // Validate lengths
    if (salt.length !== this.saltLength) {
      throw new Error('Invalid salt length');
    }
    if (iv.length !== this.ivLength) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== this.tagLength) {
      throw new Error('Invalid auth tag length');
    }

    // Derive key from encryption key using scrypt
    const key = scryptSync(encryptionKey, salt, this.keyLength);

    // Create decipher
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}
