/**
 * IHashService Interface
 *
 * Shared kernel interface for cryptographic hashing operations.
 * The domain defines WHAT it needs, infrastructure provides HOW.
 *
 * This interface is part of the shared kernel and can be used by any bounded context
 * that requires hashing capabilities (e.g., Ingestion, Refinement).
 */
export interface IHashService {
  /**
   * Computes a SHA-256 hash of the given content
   *
   * @param content - The content to hash
   * @returns A 64-character hexadecimal hash string
   */
  sha256(content: string): string;
}
