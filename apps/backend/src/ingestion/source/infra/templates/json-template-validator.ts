import { Injectable } from '@nestjs/common';
import {
  ITemplateValidator,
  ValidationResult,
  FieldValidationResult,
} from '../../domain/interfaces/templates/template-validator';

/**
 * JsonTemplateValidator
 *
 * Validates RSS source templates against the JSON schema.
 * Checks required fields, optional fields, types, and formats.
 *
 * Requirements: 2.8, 3.3, 3.4, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
@Injectable()
export class JsonTemplateValidator implements ITemplateValidator {
  /**
   * Validates a complete template
   * Requirements: 2.8, 3.3, 3.4, 3.6
   */
  validate(template: unknown): ValidationResult {
    const errors: string[] = [];

    // Check if template is an object
    if (typeof template !== 'object' || template === null) {
      return {
        isValid: false,
        errors: ['Template must be a valid JSON object'],
      };
    }

    const templateObj = template as Record<string, unknown>;

    // Validate required fields
    const feedUrlResult = this.validateField('feedUrl', templateObj.feedUrl);
    if (!feedUrlResult.isValid) {
      errors.push(feedUrlResult.error!);
    }

    const updateIntervalResult = this.validateField(
      'updateInterval',
      templateObj.updateInterval,
    );
    if (!updateIntervalResult.isValid) {
      errors.push(updateIntervalResult.error!);
    }

    // Validate optional fields if present
    if (templateObj.categories !== undefined) {
      const categoriesResult = this.validateField(
        'categories',
        templateObj.categories,
      );
      if (!categoriesResult.isValid) {
        errors.push(categoriesResult.error!);
      }
    }

    if (templateObj.language !== undefined) {
      const languageResult = this.validateField(
        'language',
        templateObj.language,
      );
      if (!languageResult.isValid) {
        errors.push(languageResult.error!);
      }
    }

    if (templateObj.maxItems !== undefined) {
      const maxItemsResult = this.validateField(
        'maxItems',
        templateObj.maxItems,
      );
      if (!maxItemsResult.isValid) {
        errors.push(maxItemsResult.error!);
      }
    }

    if (templateObj.timeout !== undefined) {
      const timeoutResult = this.validateField('timeout', templateObj.timeout);
      if (!timeoutResult.isValid) {
        errors.push(timeoutResult.error!);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a single field
   * Requirements: 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   */
  validateField(fieldName: string, value: unknown): FieldValidationResult {
    switch (fieldName) {
      case 'feedUrl':
        return this.validateFeedUrl(value);
      case 'updateInterval':
        return this.validateUpdateInterval(value);
      case 'categories':
        return this.validateCategories(value);
      case 'language':
        return this.validateLanguage(value);
      case 'maxItems':
        return this.validateMaxItems(value);
      case 'timeout':
        return this.validateTimeout(value);
      default:
        return {
          isValid: true,
        };
    }
  }

  /**
   * Validates feedUrl field
   * Requirement: 5.1
   */
  private validateFeedUrl(value: unknown): FieldValidationResult {
    if (value === undefined || value === null) {
      return {
        isValid: false,
        error: 'Missing required field: feedUrl',
      };
    }

    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: 'Invalid value for feedUrl: must be a string',
      };
    }

    if (value.trim().length === 0) {
      return {
        isValid: false,
        error: 'Invalid value for feedUrl: cannot be empty',
      };
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(value)) {
      return {
        isValid: false,
        error: 'Invalid value for feedUrl: must be a valid HTTP or HTTPS URL',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates updateInterval field
   * Requirement: 5.2
   */
  private validateUpdateInterval(value: unknown): FieldValidationResult {
    if (value === undefined || value === null) {
      return {
        isValid: false,
        error: 'Missing required field: updateInterval',
      };
    }

    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: 'Invalid value for updateInterval: must be a number',
      };
    }

    if (!Number.isInteger(value)) {
      return {
        isValid: false,
        error: 'Invalid value for updateInterval: must be an integer',
      };
    }

    if (value <= 0) {
      return {
        isValid: false,
        error: 'Invalid value for updateInterval: must be a positive integer',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates categories field
   * Requirement: 5.3
   */
  private validateCategories(value: unknown): FieldValidationResult {
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        error: 'Invalid value for categories: must be an array',
      };
    }

    if (!value.every((item) => typeof item === 'string')) {
      return {
        isValid: false,
        error: 'Invalid value for categories: must be an array of strings',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates language field
   * Requirement: 5.4
   */
  private validateLanguage(value: unknown): FieldValidationResult {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        error: 'Invalid value for language: must be a string',
      };
    }

    // Validate ISO 639-1 format (2 lowercase letters)
    const iso639Pattern = /^[a-z]{2}$/;
    if (!iso639Pattern.test(value)) {
      return {
        isValid: false,
        error:
          'Invalid value for language: must be a valid ISO 639-1 language code (2 lowercase letters)',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates maxItems field
   * Requirement: 5.5
   */
  private validateMaxItems(value: unknown): FieldValidationResult {
    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: 'Invalid value for maxItems: must be a number',
      };
    }

    if (!Number.isInteger(value)) {
      return {
        isValid: false,
        error: 'Invalid value for maxItems: must be an integer',
      };
    }

    if (value <= 0) {
      return {
        isValid: false,
        error: 'Invalid value for maxItems: must be a positive integer',
      };
    }

    return { isValid: true };
  }

  /**
   * Validates timeout field
   * Requirement: 5.6
   */
  private validateTimeout(value: unknown): FieldValidationResult {
    if (typeof value !== 'number') {
      return {
        isValid: false,
        error: 'Invalid value for timeout: must be a number',
      };
    }

    if (!Number.isInteger(value)) {
      return {
        isValid: false,
        error: 'Invalid value for timeout: must be an integer',
      };
    }

    if (value <= 0) {
      return {
        isValid: false,
        error: 'Invalid value for timeout: must be a positive integer',
      };
    }

    return { isValid: true };
  }
}
