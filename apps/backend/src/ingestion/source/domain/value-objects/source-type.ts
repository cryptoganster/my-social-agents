import { ValueObject } from '@/shared/kernel';

/**
 * SourceType Value Object
 *
 * Enumeration of supported content source types.
 * Defines which sources require authentication.
 *
 * Requirements: 1.1-1.6
 */
export enum SourceTypeEnum {
  WEB = 'WEB',
  RSS = 'RSS',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  PDF = 'PDF',
  OCR = 'OCR',
  WIKIPEDIA = 'WIKIPEDIA',
}

export interface SourceTypeProps {
  type: SourceTypeEnum;
}

export class SourceType extends ValueObject<SourceTypeProps> {
  private constructor(type: SourceTypeEnum) {
    super({ type });
    this.validate();
  }

  /**
   * Validates the source type
   */
  protected validate(): void {
    // Validation is implicit through TypeScript enum type
  }

  /**
   * Creates a SourceType from a string value
   */
  static fromString(value: string): SourceType {
    const upperValue = value.toUpperCase();
    if (!Object.values(SourceTypeEnum).includes(upperValue as SourceTypeEnum)) {
      throw new Error(
        `Invalid source type: ${value}. Must be one of: ${Object.values(SourceTypeEnum).join(', ')}`,
      );
    }
    return new SourceType(upperValue as SourceTypeEnum);
  }

  /**
   * Creates a SourceType from enum value
   */
  static fromEnum(type: SourceTypeEnum): SourceType {
    return new SourceType(type);
  }

  /**
   * Validates if the source type is valid
   */
  isValid(): boolean {
    return Object.values(SourceTypeEnum).includes(this.props.type);
  }

  /**
   * Checks if this source type requires authentication
   */
  requiresAuth(): boolean {
    const authRequiredTypes = [
      SourceTypeEnum.SOCIAL_MEDIA,
      SourceTypeEnum.WIKIPEDIA, // API key recommended for higher rate limits
    ];
    return authRequiredTypes.includes(this.props.type);
  }

  /**
   * Returns the enum value
   */
  getValue(): SourceTypeEnum {
    return this.props.type;
  }

  /**
   * Returns the string representation
   */
  toString(): string {
    return this.props.type;
  }
}
