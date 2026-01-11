/**
 * NormalizeRawContentResult
 *
 * Result of the NormalizeRawContentCommand.
 * Contains the normalized content, extracted metadata, and detected asset tags.
 */
export class NormalizeRawContentResult {
  constructor(
    public readonly normalizedContent: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly assetTags: string[],
    public readonly normalizedAt: Date,
  ) {}
}
