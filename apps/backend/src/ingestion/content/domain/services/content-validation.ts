/* eslint-disable no-control-regex */
import { Injectable } from '@nestjs/common';
import { ContentItem } from '../aggregates';
import { ContentMetadata } from '../value-objects';
import {
  IContentValidationService,
  ValidationResult,
} from '../interfaces/services/content-validation';

/**
 * ContentValidationService
 *
 * Domain service for validating content quality and completeness.
 * Ensures content meets minimum quality thresholds before persistence.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
@Injectable()
export class ContentValidationService implements IContentValidationService {
  private readonly MIN_CONTENT_LENGTH = 10;
  private readonly MAX_CONTENT_LENGTH = 1_000_000; // 1MB of text

  /**
   * Validates a ContentItem for quality and completeness
   *
   * Requirements: 7.1, 7.4, 7.5
   */
  validate(content: ContentItem): ValidationResult {
    const errors: string[] = [];

    // Validate content length
    if (!this.meetsMinimumLength(content.normalizedContent)) {
      errors.push(
        `Content is too short (minimum ${this.MIN_CONTENT_LENGTH} characters)`,
      );
    }

    // Validate content doesn't exceed maximum length
    if (content.normalizedContent.length > this.MAX_CONTENT_LENGTH) {
      errors.push(
        `Content exceeds maximum length (${this.MAX_CONTENT_LENGTH} characters)`,
      );
    }

    // Validate encoding
    if (!this.hasValidEncoding(content.normalizedContent)) {
      errors.push('Content contains invalid encoding or characters');
    }

    // Validate metadata
    if (!this.hasRequiredMetadata(content.metadata)) {
      errors.push('Content metadata is missing required fields');
    }

    // Validate content is not just whitespace
    if (content.normalizedContent.trim().length === 0) {
      errors.push('Content cannot be empty or only whitespace');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if content meets minimum length requirement
   *
   * Requirements: 7.1, 7.2
   */
  meetsMinimumLength(content: string): boolean {
    if (!content) {
      return false;
    }

    const trimmedContent = content.trim();
    return trimmedContent.length >= this.MIN_CONTENT_LENGTH;
  }

  /**
   * Checks if content has valid encoding
   *
   * Validates that:
   * - Content is valid UTF-8
   * - No invalid Unicode sequences
   * - No excessive control characters
   *
   * Requirements: 7.3
   */
  hasValidEncoding(content: string): boolean {
    if (!content) {
      return false;
    }

    try {
      // Check for invalid Unicode sequences
      // If content contains replacement characters, it might indicate encoding issues
      const replacementCharCount = (content.match(/\uFFFD/g) || []).length;
      if (replacementCharCount > 0) {
        return false;
      }

      // Check for excessive control characters (excluding common ones like \n, \t)

      const controlCharCount = (
        content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []
      ).length;
      const controlCharRatio = controlCharCount / content.length;

      // If more than 10% of content is control characters, it's likely corrupted
      if (controlCharRatio > 0.1) {
        return false;
      }

      // Check if content can be encoded/decoded without loss
      const encoded = Buffer.from(content, 'utf8');
      const decoded = encoded.toString('utf8');

      return content === decoded;
    } catch {
      // If any encoding operation fails, content has invalid encoding
      return false;
    }
  }

  /**
   * Checks if metadata has required fields
   *
   * Requirements: 7.5
   */
  hasRequiredMetadata(metadata: ContentMetadata): boolean {
    // At minimum, content should have either a title or a source URL
    return metadata.hasRequiredFields();
  }

  /**
   * Validates content against all quality thresholds
   *
   * This is a convenience method that performs all validations
   * and returns a detailed result.
   */
  validateQuality(
    content: string,
    metadata: ContentMetadata,
  ): ValidationResult {
    const errors: string[] = [];

    if (!this.meetsMinimumLength(content)) {
      errors.push(
        `Content is too short (minimum ${this.MIN_CONTENT_LENGTH} characters)`,
      );
    }

    if (content.length > this.MAX_CONTENT_LENGTH) {
      errors.push(
        `Content exceeds maximum length (${this.MAX_CONTENT_LENGTH} characters)`,
      );
    }

    if (!this.hasValidEncoding(content)) {
      errors.push('Content contains invalid encoding or characters');
    }

    if (!this.hasRequiredMetadata(metadata)) {
      errors.push('Metadata is missing required fields (title or sourceUrl)');
    }

    if (content.trim().length === 0) {
      errors.push('Content cannot be empty or only whitespace');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets the minimum content length requirement
   */
  getMinimumLength(): number {
    return this.MIN_CONTENT_LENGTH;
  }

  /**
   * Gets the maximum content length limit
   */
  getMaximumLength(): number {
    return this.MAX_CONTENT_LENGTH;
  }
}
