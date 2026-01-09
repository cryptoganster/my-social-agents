import { QualityScore } from '@refinement/domain/value-objects/quality-score';
import { CryptoEntity } from '@refinement/domain/value-objects/crypto-entity';

/**
 * IQualityAnalyzer Interface
 *
 * Defines the contract for content quality analysis.
 * Calculates quality scores based on length, coherence, relevance, and freshness.
 *
 * Requirements: Refinement 5
 * Design: Domain Services section - ContentQualityAnalyzer
 */

export interface ChunkMetadata {
  tokenCount: number;
  entities: CryptoEntity[];
  publishedAt: Date;
}

export interface IQualityAnalyzer {
  /**
   * Analyzes content quality and returns a quality score
   *
   * @param content - The content to analyze
   * @param metadata - Additional metadata for quality calculation
   * @returns Quality score with component scores
   */
  analyze(content: string, metadata: ChunkMetadata): Promise<QualityScore>;
}
