/**
 * IContentItemFactory Interface
 *
 * Factory for loading ContentItem aggregates from the Ingestion context.
 * This is an Anti-Corruption Layer (ACL) interface that allows the Refinement
 * context to access content items without depending directly on the Ingestion context.
 *
 * The infrastructure layer will provide an implementation that bridges to the
 * actual ContentItem from the Ingestion bounded context.
 *
 * Requirements: Refinement 1
 * Design: Integration Patterns - Anti-Corruption Layer
 */
export interface IContentItemFactory {
  /**
   * Loads a content item by ID
   *
   * @param contentItemId - ID of the content item
   * @returns Content item data or null if not found
   */
  load(contentItemId: string): Promise<ContentItemData | null>;
}

/**
 * ContentItemData
 *
 * Data structure representing a content item from the Ingestion context.
 * This is a simplified view containing only the data needed for refinement.
 */
export interface ContentItemData {
  contentId: string;
  sourceId: string;
  normalizedContent: string;
  metadata: {
    title?: string;
    author?: string;
    publishedAt: Date;
    sourceUrl?: string;
  };
  collectedAt: Date;
}
