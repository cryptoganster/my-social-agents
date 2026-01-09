/**
 * Result of template validation
 */
export interface ValidationResult {
  /**
   * Whether the template is valid
   */
  isValid: boolean;

  /**
   * Array of validation error messages
   */
  errors: string[];
}

/**
 * Result of field validation
 */
export interface FieldValidationResult {
  /**
   * Whether the field is valid
   */
  isValid: boolean;

  /**
   * Validation error message if invalid
   */
  error?: string;
}

/**
 * Interface for validating RSS source templates
 *
 * Defines the contract for template validation operations including
 * full template validation and individual field validation.
 *
 * Requirements: 2.8, 3.4
 */
export interface ITemplateValidator {
  /**
   * Validates a complete template
   *
   * Checks JSON syntax, required fields, optional fields,
   * field types, and field formats (URL, ISO codes, etc.).
   *
   * Requirement: 2.8, 3.4
   *
   * @param template - The template object to validate
   * @returns Validation result with errors if any
   */
  validate(template: unknown): ValidationResult;

  /**
   * Validates a single field
   *
   * Checks if a specific field value is valid according
   * to the template schema rules.
   *
   * Requirement: 3.4
   *
   * @param fieldName - The name of the field to validate
   * @param value - The field value to validate
   * @returns Field validation result with error if invalid
   */
  validateField(fieldName: string, value: unknown): FieldValidationResult;
}
