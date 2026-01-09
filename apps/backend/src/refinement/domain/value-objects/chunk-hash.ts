import { ValueObject } from '@/shared/kernel';

/**
 * Properties for ChunkHash Value Object
 */
export interface ChunkHashProps {
  hash: string;
}

/**
 * ChunkHash Value Object
 *
 * Pure, immutable value representing a chunk content hash.
 * Contains ONLY validation logic - no computation, no dependencies.
 *
 * A ChunkHash is defined as a 64-character hexadecimal string (SHA-256).
 * HOW it's computed is not the VO's concern - that's a domain service responsibility.
 *
 * Requirements: Refinement 7.1, 8.1
 * Design: Value Objects section
 */
export class ChunkHash extends ValueObject<ChunkHashProps> {
  private constructor(props: ChunkHashProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the hash property
   * This is the ONLY logic a VO should have - validation of its invariants
   *
   * Invariants:
   * - Hash must be exactly 64 characters (SHA-256 hex representation)
   * - Hash must contain only hexadecimal characters (0-9, a-f)
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
   * Creates a ChunkHash from a validated hash string
   * This is the ONLY factory method - it just wraps a value
   *
   * @param hash - A 64-character hexadecimal string
   * @returns A new ChunkHash instance
   * @throws Error if hash is invalid
   */
  static create(hash: string): ChunkHash {
    return new ChunkHash({ hash });
  }

  /**
   * Checks equality with another ChunkHash
   *
   * @param other - The ChunkHash to compare with
   * @returns true if both hashes are equal
   */
  equals(other: ChunkHash): boolean {
    return super.equals(other);
  }

  /**
   * Returns the hash as a string
   *
   * @returns The 64-character hexadecimal hash string
   */
  toString(): string {
    return this.props.hash;
  }

  /**
   * Returns the hash value (for serialization)
   *
   * @returns The hash value
   */
  get value(): string {
    return this.props.hash;
  }
}
