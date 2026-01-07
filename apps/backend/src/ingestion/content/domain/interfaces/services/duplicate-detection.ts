import { ContentHash } from '../../value-objects/content-hash';

/**
 * IDuplicateDetectionService
 *
 * Interface for duplicate detection service.
 * Identifies duplicate content using content hashing.
 *
 * Requirements: 2.4, 3.1, 3.2, 3.4
 */
export interface IDuplicateDetectionService {
  /**
   * Computes a content hash for the given content
   */
  computeHash(content: string): ContentHash;

  /**
   * Checks if content with the given hash has been seen before
   */
  isDuplicate(hash: ContentHash): boolean;

  /**
   * Records a content hash as seen and tracks duplicate detection event
   */
  recordHash(hash: ContentHash): void;

  /**
   * Gets all duplicate detection events for analytics
   */
  getDuplicateEvents(): Array<{ hash: ContentHash; detectedAt: Date }>;

  /**
   * Gets the count of unique hashes seen
   */
  getUniqueHashCount(): number;

  /**
   * Gets the count of duplicate detections
   */
  getDuplicateCount(): number;

  /**
   * Clears all recorded hashes and events (useful for testing)
   */
  clear(): void;
}
