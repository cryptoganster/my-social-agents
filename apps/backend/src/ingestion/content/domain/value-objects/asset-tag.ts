import { ValueObject } from '@/shared/kernel';

/**
 * AssetTag Value Object
 *
 * Cryptocurrency asset identifier with confidence score.
 * Used for tagging content with detected crypto asset mentions.
 *
 * Requirements: 2.3
 */
export interface AssetTagProps {
  symbol: string;
  confidence: number;
}

export class AssetTag extends ValueObject<AssetTagProps> {
  private constructor(props: AssetTagProps) {
    super(props);
    this.validate();
  }

  /**
   * Creates an AssetTag instance
   */
  static create(props: AssetTagProps): AssetTag {
    return new AssetTag({
      symbol: props.symbol.toUpperCase(),
      confidence: props.confidence,
    });
  }

  /**
   * Validates the asset tag
   */
  protected validate(): void {
    // Validate symbol format (1-10 uppercase letters)
    if (!this.props.symbol || this.props.symbol.length === 0) {
      throw new Error('Asset symbol cannot be empty');
    }

    if (this.props.symbol.length > 10) {
      throw new Error('Asset symbol cannot exceed 10 characters');
    }

    const symbolRegex = /^[A-Z]+$/;
    if (!symbolRegex.test(this.props.symbol)) {
      throw new Error('Asset symbol must contain only uppercase letters (A-Z)');
    }

    // Validate confidence range (0.0 to 1.0)
    if (this.props.confidence < 0 || this.props.confidence > 1) {
      throw new Error('Confidence must be between 0.0 and 1.0');
    }
  }

  /**
   * Checks if this is a high confidence tag (> 0.8)
   */
  isHighConfidence(): boolean {
    return this.props.confidence > 0.8;
  }

  /**
   * Checks if this is a medium confidence tag (0.5 - 0.8)
   */
  isMediumConfidence(): boolean {
    return this.props.confidence >= 0.5 && this.props.confidence <= 0.8;
  }

  /**
   * Checks if this is a low confidence tag (< 0.5)
   */
  isLowConfidence(): boolean {
    return this.props.confidence < 0.5;
  }

  // Getters
  get symbol(): string {
    return this.props.symbol;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return `${this.props.symbol} (${(this.props.confidence * 100).toFixed(1)}%)`;
  }
}
