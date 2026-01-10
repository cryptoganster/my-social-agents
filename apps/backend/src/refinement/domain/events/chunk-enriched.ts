/**
 * CryptoEntityData
 *
 * Data structure for crypto entity in events.
 */
export interface CryptoEntityData {
  readonly type: string;
  readonly value: string;
  readonly confidence: number;
  readonly startPos: number;
  readonly endPos: number;
}

/**
 * TemporalContextData
 *
 * Data structure for temporal context in events.
 */
export interface TemporalContextData {
  readonly publishedAt: Date;
  readonly eventTimestamp?: Date;
}

/**
 * QualityScoreData
 *
 * Data structure for quality score in events.
 */
export interface QualityScoreData {
  readonly overall: number;
  readonly lengthScore: number;
  readonly coherenceScore: number;
  readonly relevanceScore: number;
  readonly freshnessScore: number;
}

/**
 * ChunkEnriched Domain Event
 *
 * Published when a chunk has been enriched with entities, temporal context,
 * and quality score. This event triggers adding the chunk to the refinement
 * aggregate if it passes quality threshold.
 *
 * Requirements: Refinement 3, 4, 5
 * Design: Domain Events section - Event-Driven Pipeline
 */
export class ChunkEnriched {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkId: string,
    public readonly chunkContent: string,
    public readonly chunkIndex: number,
    public readonly totalChunks: number,
    public readonly entities: CryptoEntityData[],
    public readonly temporalContext: TemporalContextData | null,
    public readonly qualityScore: QualityScoreData,
    public readonly passedQualityThreshold: boolean,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
