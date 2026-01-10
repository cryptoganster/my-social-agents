/**
 * ContentNormalized
 *
 * Domain event published when raw content has been successfully normalized.
 * Contains the normalized content, extracted metadata, and detected asset tags.
 *
 * Triggers: ValidateContentQualityCommand
 *
 * Requirements: 2.1, 2.2
 */
export class ContentNormalized {
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
    public readonly collectedAt: Date,
    public readonly normalizedAt: Date,
  ) {}
}
