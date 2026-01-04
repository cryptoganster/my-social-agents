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

export class AssetTag {
  private readonly _symbol: string;
  private readonly _confidence: number;

  private constructor(props: AssetTagProps) {
    this._symbol = props.symbol.toUpperCase();
    this._confidence = props.confidence;

    this.validate();
  }

  /**
   * Creates an AssetTag instance
   */
  static create(props: AssetTagProps): AssetTag {
    return new AssetTag(props);
  }

  /**
   * Validates the asset tag
   */
  private validate(): void {
    // Validate symbol format (1-10 uppercase letters)
    if (!this._symbol || this._symbol.length === 0) {
      throw new Error('Asset symbol cannot be empty');
    }

    if (this._symbol.length > 10) {
      throw new Error('Asset symbol cannot exceed 10 characters');
    }

    const symbolRegex = /^[A-Z]+$/;
    if (!symbolRegex.test(this._symbol)) {
      throw new Error('Asset symbol must contain only uppercase letters (A-Z)');
    }

    // Validate confidence range (0.0 to 1.0)
    if (this._confidence < 0 || this._confidence > 1) {
      throw new Error('Confidence must be between 0.0 and 1.0');
    }
  }

  /**
   * Checks if this is a high confidence tag (> 0.8)
   */
  isHighConfidence(): boolean {
    return this._confidence > 0.8;
  }

  /**
   * Checks if this is a medium confidence tag (0.5 - 0.8)
   */
  isMediumConfidence(): boolean {
    return this._confidence >= 0.5 && this._confidence <= 0.8;
  }

  /**
   * Checks if this is a low confidence tag (< 0.5)
   */
  isLowConfidence(): boolean {
    return this._confidence < 0.5;
  }

  // Getters
  get symbol(): string {
    return this._symbol;
  }

  get confidence(): number {
    return this._confidence;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): AssetTagProps {
    return {
      symbol: this._symbol,
      confidence: this._confidence,
    };
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return `${this._symbol} (${(this._confidence * 100).toFixed(1)}%)`;
  }

  /**
   * Checks equality with another AssetTag
   */
  equals(other: AssetTag): boolean {
    return (
      this._symbol === other._symbol &&
      Math.abs(this._confidence - other._confidence) < 0.001 // Float comparison with epsilon
    );
  }
}
