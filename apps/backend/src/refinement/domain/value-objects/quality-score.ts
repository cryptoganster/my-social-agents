import { ValueObject } from '@/shared/kernel';

/**
 * Properties for QualityScore Value Object
 */
export interface QualityScoreProps {
  overall: number;
  lengthScore: number;
  coherenceScore: number;
  relevanceScore: number;
  freshnessScore: number;
}

/**
 * QualityScore Value Object
 *
 * Represents a numerical assessment of content quality with component scores.
 * Immutable value object that captures overall quality and individual quality dimensions.
 *
 * Quality dimensions:
 * - Length: Adequate token count (50-1000 tokens)
 * - Coherence: Semantic consistency within chunk
 * - Relevance: Presence of crypto entities
 * - Freshness: Temporal recency of content
 *
 * Quality thresholds:
 * - High quality: overall > 0.7
 * - Medium quality: 0.5 <= overall <= 0.7
 * - Low quality: 0.3 <= overall < 0.5
 * - Rejected: overall < 0.3
 *
 * Requirements: Refinement 5.1, 5.5
 * Design: Value Objects section - QualityScore
 */
export class QualityScore extends ValueObject<QualityScoreProps> {
  private constructor(props: QualityScoreProps) {
    super(props);
    this.validate();
  }

  /**
   * Validates the quality score properties
   *
   * Invariants:
   * - All scores must be between 0 and 1 (inclusive)
   * - All scores must be valid numbers (not NaN)
   */
  protected validate(): void {
    // Validate overall score
    if (
      typeof this.props.overall !== 'number' ||
      Number.isNaN(this.props.overall) ||
      this.props.overall < 0 ||
      this.props.overall > 1
    ) {
      throw new Error(
        'Invalid overall score: must be a number between 0 and 1 (inclusive)',
      );
    }

    // Validate lengthScore
    if (
      typeof this.props.lengthScore !== 'number' ||
      Number.isNaN(this.props.lengthScore) ||
      this.props.lengthScore < 0 ||
      this.props.lengthScore > 1
    ) {
      throw new Error(
        'Invalid lengthScore: must be a number between 0 and 1 (inclusive)',
      );
    }

    // Validate coherenceScore
    if (
      typeof this.props.coherenceScore !== 'number' ||
      Number.isNaN(this.props.coherenceScore) ||
      this.props.coherenceScore < 0 ||
      this.props.coherenceScore > 1
    ) {
      throw new Error(
        'Invalid coherenceScore: must be a number between 0 and 1 (inclusive)',
      );
    }

    // Validate relevanceScore
    if (
      typeof this.props.relevanceScore !== 'number' ||
      Number.isNaN(this.props.relevanceScore) ||
      this.props.relevanceScore < 0 ||
      this.props.relevanceScore > 1
    ) {
      throw new Error(
        'Invalid relevanceScore: must be a number between 0 and 1 (inclusive)',
      );
    }

    // Validate freshnessScore
    if (
      typeof this.props.freshnessScore !== 'number' ||
      Number.isNaN(this.props.freshnessScore) ||
      this.props.freshnessScore < 0 ||
      this.props.freshnessScore > 1
    ) {
      throw new Error(
        'Invalid freshnessScore: must be a number between 0 and 1 (inclusive)',
      );
    }
  }

  /**
   * Creates a QualityScore from component scores
   *
   * @param overall - Overall quality score (0.0 - 1.0)
   * @param lengthScore - Length quality score (0.0 - 1.0)
   * @param coherenceScore - Coherence quality score (0.0 - 1.0)
   * @param relevanceScore - Relevance quality score (0.0 - 1.0)
   * @param freshnessScore - Freshness quality score (0.0 - 1.0)
   * @returns A new QualityScore instance
   * @throws Error if any score is invalid
   */
  static create(
    overall: number,
    lengthScore: number,
    coherenceScore: number,
    relevanceScore: number,
    freshnessScore: number,
  ): QualityScore {
    return new QualityScore({
      overall,
      lengthScore,
      coherenceScore,
      relevanceScore,
      freshnessScore,
    });
  }

  /**
   * Gets the overall quality score
   */
  get overall(): number {
    return this.props.overall;
  }

  /**
   * Gets the length quality score
   */
  get lengthScore(): number {
    return this.props.lengthScore;
  }

  /**
   * Gets the coherence quality score
   */
  get coherenceScore(): number {
    return this.props.coherenceScore;
  }

  /**
   * Gets the relevance quality score
   */
  get relevanceScore(): number {
    return this.props.relevanceScore;
  }

  /**
   * Gets the freshness quality score
   */
  get freshnessScore(): number {
    return this.props.freshnessScore;
  }

  /**
   * Checks if this is high quality content (overall > 0.7)
   */
  get isHighQuality(): boolean {
    return this.props.overall > 0.7;
  }

  /**
   * Checks if this is medium quality content (0.5 <= overall <= 0.7)
   */
  get isMediumQuality(): boolean {
    return this.props.overall >= 0.5 && this.props.overall <= 0.7;
  }

  /**
   * Checks if this is low quality content (0.3 <= overall < 0.5)
   */
  get isLowQuality(): boolean {
    return this.props.overall >= 0.3 && this.props.overall < 0.5;
  }

  /**
   * Checks if this content should be rejected (overall < 0.3)
   */
  get isRejected(): boolean {
    return this.props.overall < 0.3;
  }

  /**
   * Returns a string representation of the quality score
   */
  toString(): string {
    return `QualityScore(overall=${this.props.overall.toFixed(2)}, length=${this.props.lengthScore.toFixed(2)}, coherence=${this.props.coherenceScore.toFixed(2)}, relevance=${this.props.relevanceScore.toFixed(2)}, freshness=${this.props.freshnessScore.toFixed(2)})`;
  }
}
