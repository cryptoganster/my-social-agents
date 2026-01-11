/**
 * ContentQualityValidated
 *
 * Domain event published when content has passed quality validation.
 * Contains all data needed for the next step (deduplication).
 *
 * Triggers: DetectDuplicateContentCommand
 *
 * Requirements: 2.3, 3.1
 */
export class ContentQualityValidated {
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
    public readonly qualityScore: number,
    public readonly collectedAt: Date,
    public readonly validatedAt: Date,
  ) {}
}
