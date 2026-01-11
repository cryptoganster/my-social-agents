/**
 * ContentDeduplicationChecked
 *
 * Domain event published when content has been checked for duplicates.
 * Contains the result of deduplication check and all data needed for persistence.
 *
 * If isDuplicate is false, triggers: SaveContentItemCommand
 * If isDuplicate is true, the pipeline stops (content already exists)
 *
 * Requirements: 3.2, 3.3
 */
export class ContentDeduplicationChecked {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly rawContent: string,
    public readonly normalizedContent: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly assetTags: string[],
    public readonly contentHash: string,
    public readonly isDuplicate: boolean,
    public readonly existingContentId: string | null,
    public readonly collectedAt: Date,
    public readonly checkedAt: Date,
  ) {}
}
