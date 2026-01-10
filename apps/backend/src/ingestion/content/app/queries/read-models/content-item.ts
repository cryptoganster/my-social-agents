/**
 * ContentItemReadModel
 *
 * Read model for content item queries.
 * Contains all content properties in a flat structure optimized for querying.
 * Used by query handlers to return content data.
 *
 * NOT a CQRS projection - queries write table directly.
 *
 * Requirements: 5.1, 8.1
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
