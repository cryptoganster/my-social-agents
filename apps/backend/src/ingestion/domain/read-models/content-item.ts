/**
 * ContentItemReadModel
 *
 * Optimized read model for querying content items.
 * This is a plain object (not an aggregate) used for read operations.
 * Contains all content properties in a flat structure for efficient querying.
 *
 * Requirements: 10.1
 */
export interface ContentItemReadModel {
  contentId: string;
  sourceId: string;

  // Content hash (as string)
  contentHash: string;

  // Content
  rawContent: string;
  normalizedContent: string;

  // Metadata (flattened)
  title: string | null;
  author: string | null;
  publishedAt: Date | null;
  language: string | null;
  sourceUrl: string | null;

  // Asset tags (as JSON or array)
  assetTags: Array<{
    symbol: string;
    confidence: number;
  }>;

  // Timestamps
  collectedAt: Date;

  // Version for optimistic locking
  version: number;

  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}
