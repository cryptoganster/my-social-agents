import { QualityScore } from '@refinement/domain/value-objects/quality-score';
import {
  IQualityAnalyzer,
  ChunkMetadata,
} from '@refinement/domain/interfaces/services/quality-analyzer';

/**
 * ContentQualityAnalyzer Domain Service
 *
 * Analyzes content quality based on multiple factors:
 * - Length: Token count adequacy
 * - Coherence: Semantic consistency (placeholder for now)
 * - Relevance: Presence of crypto entities
 * - Freshness: Temporal recency
 *
 * Requirements: Refinement 5
 * Design: Domain Services section - ContentQualityAnalyzer
 */
export class ContentQualityAnalyzer implements IQualityAnalyzer {
  /**
   * Analyzes content quality and returns a quality score
   *
   * @param content - The content to analyze
   * @param metadata - Additional metadata for quality calculation
   * @returns Quality score with component scores
   */
  analyze(content: string, metadata: ChunkMetadata): Promise<QualityScore> {
    // Calculate component scores
    const lengthScore = this.calculateLengthScore(metadata.tokenCount);
    const coherenceScore = this.calculateCoherenceScore(content);
    const relevanceScore = this.calculateRelevanceScore(
      metadata.entities.length,
    );
    const freshnessScore = this.calculateFreshnessScore(metadata.publishedAt);

    // Calculate weighted overall score
    const overall = this.calculateOverallScore(
      lengthScore,
      coherenceScore,
      relevanceScore,
      freshnessScore,
    );

    return Promise.resolve(
      QualityScore.create(
        overall,
        lengthScore,
        coherenceScore,
        relevanceScore,
        freshnessScore,
      ),
    );
  }

  /**
   * Calculates length score based on token count
   *
   * Scoring:
   * - < 50 tokens: 0.0
   * - 50-100 tokens: Linear scale 0.0-1.0
   * - 100-800 tokens: 1.0 (optimal)
   * - > 800 tokens: Decreasing (too long)
   */
  private calculateLengthScore(tokenCount: number): number {
    if (tokenCount < 50) {
      return 0.0;
    }
    if (tokenCount < 100) {
      return (tokenCount - 50) / 50;
    }
    if (tokenCount <= 800) {
      return 1.0;
    }
    // Penalize very long chunks
    return Math.max(0.5, 1.0 - (tokenCount - 800) / 200);
  }

  /**
   * Calculates coherence score
   *
   * TODO: Implement semantic coherence analysis
   * For now, returns a placeholder score based on basic heuristics
   */
  private calculateCoherenceScore(content: string): number {
    // Placeholder: Basic heuristics
    // - Check for complete sentences
    // - Check for paragraph structure
    // - Check for excessive repetition

    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    if (sentences.length === 0) {
      return 0.0;
    }

    // Simple heuristic: More sentences = better coherence (up to a point)
    const sentenceScore = Math.min(1.0, sentences.length / 5);

    return sentenceScore;
  }

  /**
   * Calculates relevance score based on entity count
   *
   * Scoring:
   * - 0 entities: 0.0
   * - 1 entity: 0.3
   * - 2 entities: 0.6
   * - 3+ entities: 1.0
   */
  private calculateRelevanceScore(entityCount: number): number {
    if (entityCount === 0) {
      return 0.0;
    }
    if (entityCount === 1) {
      return 0.3;
    }
    if (entityCount === 2) {
      return 0.6;
    }
    return 1.0;
  }

  /**
   * Calculates freshness score based on publication date
   *
   * Scoring:
   * - Last 7 days: 1.0
   * - Last 30 days: 0.8
   * - Last 90 days: 0.6
   * - Last 180 days: 0.4
   * - Older: 0.2
   */
  private calculateFreshnessScore(publishedAt: Date): number {
    const now = new Date();
    const ageInDays =
      (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 7) {
      return 1.0;
    }
    if (ageInDays <= 30) {
      return 0.8;
    }
    if (ageInDays <= 90) {
      return 0.6;
    }
    if (ageInDays <= 180) {
      return 0.4;
    }
    return 0.2;
  }

  /**
   * Calculates weighted overall score
   *
   * Weights:
   * - Length: 25%
   * - Coherence: 25%
   * - Relevance: 30%
   * - Freshness: 20%
   */
  private calculateOverallScore(
    lengthScore: number,
    coherenceScore: number,
    relevanceScore: number,
    freshnessScore: number,
  ): number {
    return (
      lengthScore * 0.25 +
      coherenceScore * 0.25 +
      relevanceScore * 0.3 +
      freshnessScore * 0.2
    );
  }
}
