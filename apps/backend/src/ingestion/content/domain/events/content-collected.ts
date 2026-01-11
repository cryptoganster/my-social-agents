/**
 * ContentCollected
 *
 * Domain event published when raw content is collected from a source.
 * Triggers the content processing pipeline (validation, normalization, persistence).
 *
 * Requirements: 1.6, 2.1, 2.2
 */
export class ContentCollected {
  constructor(
    public readonly sourceId: string,
    public readonly jobId: string,
    public readonly rawContent: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly sourceType: string,
    public readonly collectedAt: Date,
  ) {}
}
