import {
  CryptoEntityData,
  TemporalContextData,
  QualityScoreData,
} from '@refinement/domain/events/chunk-enriched';

/**
 * EnrichChunkResult
 *
 * Result of the EnrichChunkCommand execution.
 * Contains the enrichment data for a single chunk.
 *
 * Requirements: Refinement 3, 4, 5
 * Design: Application Layer - Command Results
 */
export class EnrichChunkResult {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkId: string,
    public readonly chunkIndex: number,
    public readonly entities: CryptoEntityData[],
    public readonly temporalContext: TemporalContextData | null,
    public readonly qualityScore: QualityScoreData,
    public readonly isValid: boolean,
    public readonly status: 'enriched' | 'rejected' | 'failed',
    public readonly rejectionReason?: string,
    public readonly error?: {
      code: string;
      message: string;
    },
  ) {}
}
