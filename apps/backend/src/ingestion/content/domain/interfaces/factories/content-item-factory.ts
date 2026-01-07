import { ContentItem } from '../../aggregates/content-item';

/**
 * IContentItemFactory Interface
 *
 * Factory for reconstituting ContentItem aggregates from persistence.
 * Uses read repositories internally to load data and reconstructs
 * the aggregate with its full behavior.
 *
 * Requirements: 10.1
 */
export interface IContentItemFactory {
  /**
   * Loads and reconstitutes a ContentItem aggregate from persistence
   * Returns null if the content item does not exist
   * The reconstituted aggregate includes full business logic and behavior
   */
  load(contentId: string): Promise<ContentItem | null>;
}
