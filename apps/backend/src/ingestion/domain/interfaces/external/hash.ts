/**
 * Hash computation abstraction
 *
 * Domain interface for cryptographic hashing operations.
 * The domain defines WHAT it needs, infrastructure provides HOW.
 */
export interface Hash {
  /**
   * Computes a SHA-256 hash of the given content
   *
   * @param content - The content to hash
   * @returns A 64-character hexadecimal hash string
   */
  sha256(content: string): string;
}
