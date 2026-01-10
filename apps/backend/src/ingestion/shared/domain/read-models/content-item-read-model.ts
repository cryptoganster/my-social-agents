/**
 * Read model for Content Item
 * Used for cross-context queries without coupling to Content sub-context
 */
export interface ContentItemReadModel {
  contentId: string;
  sourceId: string;
  contentHash: string;
  normalizedContent: string;
  metadata: {
    title?: string;
    author?: string;
    publishedAt?: Date;
    language?: string;
    sourceUrl?: string;
  };
  assetTags: string[];
  collectedAt: Date;
}
