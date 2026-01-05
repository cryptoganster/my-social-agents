import { ContentHash } from '../value-objects/content-hash';
import { IHashService } from '../interfaces/external';

/**
 * Content Hash Generator Domain Service
 *
 * Domain service responsible for generating ContentHash value objects.
 * This is where the domain logic of "how to create a hash from content" lives.
 *
 * Domain services are used when:
 * - The operation doesn't naturally belong to a single entity/VO
 * - The operation requires external dependencies (via interfaces)
 * - The operation represents a domain concept (not just technical plumbing)
 *
 * This service depends on the IHashService abstraction (technical concern),
 * but the VO remains pure and dependency-free.
 */
export class ContentHashGenerator {
  constructor(private readonly hash: IHashService) {}

  /**
   * Generates a ContentHash from raw content
   *
   * This is a domain operation: "compute a content identifier"
   * The HOW (SHA-256 via crypto) is delegated to infrastructure
   *
   * @param content - The content to hash
   * @returns A ContentHash value object
   */
  generate(content: string): ContentHash {
    const hashValue = this.hash.sha256(content);
    return ContentHash.create(hashValue);
  }

  /**
   * Creates a ContentHash from an existing hash string
   * Useful for reconstituting from persistence
   *
   * @param hash - The hash string
   * @returns A ContentHash value object
   */
  fromString(hash: string): ContentHash {
    return ContentHash.create(hash);
  }
}
