/**
 * ChunkData
 *
 * Data structure for chunk information in the ContentChunked event.
 */
export interface ChunkData {
  readonly id: string;
  readonly content: string;
  readonly index: number;
}

/**
 * ContentChunked Domain Event
 *
 * Published when content has been successfully chunked into semantic fragments.
 * This event triggers the enrichment pipeline for each chunk.
 *
 * Requirements: Refinement 2
 * Design: Domain Events section - Event-Driven Pipeline
 */
export class ContentChunked {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkCount: number,
    public readonly chunks: ChunkData[],
    public readonly publishedAt: Date,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }

  /**
   * Helper to get chunk IDs for backward compatibility
   */
  get chunkIds(): string[] {
    return this.chunks.map((c) => c.id);
  }
}
