import * as fc from 'fast-check';
import { CredentialEncryptionService } from '../credential-encryption';

describe('CredentialEncryptionService', () => {
  let service: CredentialEncryptionService;
  const encryptionKey = 'test-master-key-with-at-least-32-characters-long';

  beforeEach(() => {
    service = new CredentialEncryptionService();
  });

  describe('Unit Tests', () => {
    it('should encrypt and decrypt a credential', () => {
      const plaintext = 'my-secret-api-key';

      const encrypted = service.encrypt(plaintext, encryptionKey);
      const decrypted = service.decrypt(encrypted, encryptionKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'my-secret-api-key';

      const encrypted1 = service.encrypt(plaintext, encryptionKey);
      const encrypted2 = service.encrypt(plaintext, encryptionKey);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      const decrypted1 = service.decrypt(encrypted1, encryptionKey);
      const decrypted2 = service.decrypt(encrypted2, encryptionKey);

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should throw error for empty plaintext', () => {
      expect(() => service.encrypt('', encryptionKey)).toThrow(
        'Cannot encrypt empty plaintext',
      );
    });

    it('should throw error for empty encrypted string', () => {
      expect(() => service.decrypt('', encryptionKey)).toThrow(
        'Cannot decrypt empty string',
      );
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => service.decrypt('invalid-format', encryptionKey)).toThrow(
        'Invalid encrypted format',
      );
    });

    it('should throw error for short encryption key', () => {
      const shortKey = 'short';

      expect(() => service.encrypt('test', shortKey)).toThrow(
        'Encryption key must be at least 32 characters',
      );
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'my-secret-api-key';
      const wrongKey = 'wrong-master-key-with-at-least-32-characters-long';

      const encrypted = service.encrypt(plaintext, encryptionKey);

      expect(() => service.decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should handle special characters', () => {
      const plaintext = 'key-with-special-chars: !@#$%^&*()_+-=[]{}|;:,.<>?';

      const encrypted = service.encrypt(plaintext, encryptionKey);
      const decrypted = service.decrypt(encrypted, encryptionKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'key-with-unicode: 你好世界 🔐🔑';

      const encrypted = service.encrypt(plaintext, encryptionKey);
      const decrypted = service.decrypt(encrypted, encryptionKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce encrypted string in correct format', () => {
      const plaintext = 'test-credential';

      const encrypted = service.encrypt(plaintext, encryptionKey);

      // Format: salt:iv:authTag:ciphertext
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);

      // Each part should be valid base64
      parts.forEach((part) => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      });
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'my-secret-api-key';

      const encrypted = service.encrypt(plaintext, encryptionKey);

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      parts[3] = parts[3].slice(0, -1) + 'X'; // Change last character
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered, encryptionKey)).toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: content-ingestion, Property 14: Credential Encryption
    // Validates: Requirements 5.5
    it('Property 14: Credential Encryption - round-trip property', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (plaintext) => {
            const encrypted = service.encrypt(plaintext, encryptionKey);
            const decrypted = service.decrypt(encrypted, encryptionKey);

            expect(decrypted).toBe(plaintext);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 14: Credential Encryption - different IVs produce different ciphertexts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (plaintext) => {
            const encrypted1 = service.encrypt(plaintext, encryptionKey);
            const encrypted2 = service.encrypt(plaintext, encryptionKey);

            // Different ciphertexts due to random IV
            expect(encrypted1).not.toBe(encrypted2);

            // But both decrypt to same plaintext
            const decrypted1 = service.decrypt(encrypted1, encryptionKey);
            const decrypted2 = service.decrypt(encrypted2, encryptionKey);

            expect(decrypted1).toBe(plaintext);
            expect(decrypted2).toBe(plaintext);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('Property 14: Credential Encryption - encrypted format is always valid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (plaintext) => {
            const encrypted = service.encrypt(plaintext, encryptionKey);

            // Should have 4 parts separated by colons
            const parts = encrypted.split(':');
            expect(parts).toHaveLength(4);

            // Each part should be valid base64
            parts.forEach((part) => {
              expect(() => Buffer.from(part, 'base64')).not.toThrow();
              expect(part.length).toBeGreaterThan(0);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 14: Credential Encryption - wrong key always fails decryption', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 32, maxLength: 64 }),
          (plaintext, wrongKey) => {
            // Skip if wrongKey is same as encryptionKey
            if (wrongKey === encryptionKey) {
              return;
            }

            const encrypted = service.encrypt(plaintext, encryptionKey);

            // Decrypting with wrong key should fail
            expect(() => service.decrypt(encrypted, wrongKey)).toThrow();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
