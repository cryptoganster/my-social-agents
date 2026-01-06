import { ValueObject } from '@/shared/kernel';

/**
 * Properties for ContentHash Value Object
 */
export interface ContentHashProps {
  hash: string;
}

/**
 * ContentHash Value Object
 *
 * Pure, immutable value representing a content hash.
 * Contains ONLY validation logic - no computation, no dependencies.
 *
 * A ContentHash is defined as a 64-character hexadecimal string.
 * HOW it's computed is not the VO's concern - that's a domain service responsibility.
 *
 * Requirements: 2.4, 3.1
 */
export class ContentHash extends ValueObject<ContentHashProps> {
  private constructor(props: ContentHashProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the hash property
   * This is the ONLY logic a VO should have - validation of its invariants
   */
  protected validate(): void {
    if (!this.props.hash || this.props.hash.length !== 64) {
      throw new Error('Invalid hash: must be 64-character hex string');
    }

    if (!/^[0-9a-f]{64}$/.test(this.props.hash)) {
      throw new Error('Invalid hash: must contain only hexadecimal characters');
    }
  }

  /**
   * Creates a ContentHash from a validated hash string
   * This is the ONLY factory method - it just wraps a value
   */
  static create(hash: string): ContentHash {
    return new ContentHash({ hash });
  }

  /**
   * Checks equality with another ContentHash
   */
  equals(other: ContentHash): boolean {
    return super.equals(other);
  }

  /**
   * Returns the hash as a string
   */
  toString(): string {
    return this.props.hash;
  }

  /**
   * Returns the hash value (for serialization)
   */
  getValue(): string {
    return this.props.hash;
  }
}
