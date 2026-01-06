/**
 * ContentCollectedEvent
 *
 * Domain event published when raw content is collected from a source.
 * Triggers the content processing pipeline (validation, normalization, persistence).
 *
 * Requirements: 1.6
 */
export class ContentCollectedEvent {
  constructor(
    public readonly sourceId: string,
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
