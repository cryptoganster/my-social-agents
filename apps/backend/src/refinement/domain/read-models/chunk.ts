/**
 * ChunkReadModel
 *
 * Plain object representation of a Chunk for read operations.
 * Optimized for queries, no behavior.
 *
 * Note: Chunks are accessed through ContentRefinement aggregate.
 * This read model is used when querying chunk data through the
 * ContentRefinementReadRepository specialized methods.
 *
 * Requirements: Refinement 2, 7
 * Design: Read Models section
 */
export interface ChunkReadModel {
  id: string;
  contentId: string;
  content: string;
  position: {
    index: number;
    startOffset: number;
    endOffset: number;
  };
  hash: string;
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    startPos: number;
    endPos: number;
  }>;
  temporalContext: {
    publishedAt: Date;
    eventTimestamp: Date | null;
    windowStart: Date | null;
    windowEnd: Date | null;
  } | null;
  qualityScore: {
    overall: number;
    lengthScore: number;
    coherenceScore: number;
    relevanceScore: number;
    freshnessScore: number;
  };
  previousChunkId: string | null;
  nextChunkId: string | null;
}
