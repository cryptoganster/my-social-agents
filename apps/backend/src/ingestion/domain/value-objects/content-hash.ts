import { createHash } from 'crypto';

/**
 * ContentHash Value Object
 *
 * Immutable hash derived from content using SHA-256.
 * Used for duplicate detection and content identification.
 *
 * Requirements: 2.4, 3.1
 */
export class ContentHash {
  private readonly hash: string;

  private constructor(hash: string) {
    this.hash = hash;
  }

  /**
   * Creates a ContentHash from raw content by computing SHA-256 hash
   */
  static fromContent(content: string): ContentHash {
    const hash = createHash('sha256').update(content, 'utf8').digest('hex');
    return new ContentHash(hash);
  }

  /**
   * Creates a ContentHash from an existing hash string
   */
  static fromHash(hash: string): ContentHash {
    if (!hash || hash.length !== 64) {
      throw new Error('Invalid hash: must be 64-character hex string');
    }
    return new ContentHash(hash);
  }

  /**
   * Checks equality with another ContentHash
   */
  equals(other: ContentHash): boolean {
    return this.hash === other.hash;
  }

  /**
   * Returns the hash as a string
   */
  toString(): string {
    return this.hash;
  }

  /**
   * Returns the hash value (for serialization)
   */
  getValue(): string {
    return this.hash;
  }
}
