import { ContentHash } from '../value-objects';
import { ContentHashGenerator } from './content-hash-generator';

/**
 * DuplicateDetectionService
 *
 * Domain service for identifying duplicate content using content hashing.
 * Maintains an in-memory cache of seen hashes for duplicate detection.
 * In production, this would be backed by a persistent store.
 *
 * Requirements: 2.4, 3.1, 3.2, 3.4
 */
export class DuplicateDetectionService {
  private readonly seenHashes: Set<string> = new Set();
  private readonly duplicateEvents: Array<{
    hash: ContentHash;
    detectedAt: Date;
  }> = [];

  constructor(private readonly hashGenerator: ContentHashGenerator) {}

  /**
   * Computes a content hash for the given content
   *
   * Requirements: 2.4, 3.1
   */
  computeHash(content: string): ContentHash {
    return this.hashGenerator.generate(content);
  }

  /**
   * Checks if content with the given hash has been seen before
   *
   * Requirements: 3.2
   */
  isDuplicate(hash: ContentHash): boolean {
    return this.seenHashes.has(hash.getValue());
  }

  /**
   * Records a content hash as seen and tracks duplicate detection event
   *
   * Requirements: 3.2, 3.4
   */
  recordHash(hash: ContentHash): void {
    const hashValue = hash.getValue();

    // Check if this is a duplicate before recording
    const wasDuplicate = this.seenHashes.has(hashValue);

    // Record the hash
    this.seenHashes.add(hashValue);

    // If it was a duplicate, record the event
    if (wasDuplicate) {
      this.duplicateEvents.push({
        hash,
        detectedAt: new Date(),
      });
    }
  }

  /**
   * Gets all duplicate detection events for analytics
   *
   * Requirements: 3.4
   */
  getDuplicateEvents(): Array<{ hash: ContentHash; detectedAt: Date }> {
    return [...this.duplicateEvents];
  }

  /**
   * Gets the count of unique hashes seen
   */
  getUniqueHashCount(): number {
    return this.seenHashes.size;
  }

  /**
   * Gets the count of duplicate detections
   */
  getDuplicateCount(): number {
    return this.duplicateEvents.length;
  }

  /**
   * Clears all recorded hashes and events (useful for testing)
   */
  clear(): void {
    this.seenHashes.clear();
    this.duplicateEvents.length = 0;
  }
}
