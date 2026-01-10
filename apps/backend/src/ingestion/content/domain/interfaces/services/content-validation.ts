import { ContentItem } from '../../aggregates';
import { ContentMetadata } from '../../value-objects';

/**
 * ValidationResult
 *
 * Result of content validation with detailed error information
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  qualityScore?: number;
}

/**
 * IContentValidationService
 *
 * Interface for content validation service.
 * Ensures content meets minimum quality thresholds before persistence.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export interface IContentValidationService {
  /**
   * Validates a ContentItem for quality and completeness
   */
  validate(content: ContentItem): ValidationResult;

  /**
   * Checks if content meets minimum length requirement
   */
  meetsMinimumLength(content: string): boolean;

  /**
   * Checks if content has valid encoding
   */
  hasValidEncoding(content: string): boolean;

  /**
   * Checks if metadata has required fields
   */
  hasRequiredMetadata(metadata: ContentMetadata): boolean;

  /**
   * Validates content against all quality thresholds
   */
  validateQuality(content: string, metadata: ContentMetadata): ValidationResult;

  /**
   * Gets the minimum content length requirement
   */
  getMinimumLength(): number;

  /**
   * Gets the maximum content length limit
   */
  getMaximumLength(): number;
}
