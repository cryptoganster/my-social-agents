/**
 * ContentIngested
 *
 * Domain event published when content has been successfully ingested
 * (validated, normalized, deduplicated, and persisted).
 *
 * Enhanced with full content data to enable event-carried state transfer pattern.
 * Maintains backward compatibility with existing subscribers.
 *
 * Requirements: 1.1, 1.4, 2.1, 2.2, 3.5, 5.1, 5.4
 */
export class ContentIngested {
  constructor(
    public readonly contentId: string,
    public readonly sourceId: string,
    public readonly jobId: string,
    public readonly contentHash: string,
    public readonly normalizedContent: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly assetTags: string[],
    public readonly collectedAt: Date,
    public readonly persistedAt: Date,
  ) {}
}
