import * as fc from 'fast-check';
import { JsonTemplateValidator } from '../json-template-validator';
import { TemplateConfiguration } from '../../../domain/value-objects/template-configuration';
import { TemplateMetadata } from '../../../domain/value-objects/template-metadata';

/**
 * Property-Based Tests for JsonTemplateValidator
 *
 * These tests validate universal correctness properties across many randomly generated inputs.
 * Each property test runs 100 iterations by default.
 */
describe('JsonTemplateValidator - Property-Based Tests', () => {
  let validator: JsonTemplateValidator;

  beforeEach(() => {
    validator = new JsonTemplateValidator();
  });

  /**
   * Property 1: Required fields presence
   * Validates: Requirements 2.1, 2.2, 2.8
   *
   * Property: Any template with valid feedUrl and updateInterval should pass validation
   */
  describe('Property 1: Required fields presence', () => {
    it('should pass validation when required fields are present and valid', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when feedUrl is missing', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 86400 }), (updateInterval) => {
          const template = {
            updateInterval,
          };

          const result = validator.validate(template);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Missing required field: feedUrl');
        }),
        { numRuns: 100 },
      );
    });

    it('should fail validation when updateInterval is missing', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (feedUrl) => {
            const template = {
              feedUrl,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
              'Missing required field: updateInterval',
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when both required fields are missing', () => {
      fc.assert(
        fc.property(fc.constant({}), (template) => {
          const result = validator.validate(template);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Missing required field: feedUrl');
          expect(result.errors).toContain(
            'Missing required field: updateInterval',
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Optional field type validation
   * Validates: Requirements 2.3, 2.4, 2.5, 2.6
   *
   * Property: Templates with valid optional fields should pass validation
   */
  describe('Property 2: Optional field type validation', () => {
    it('should pass validation with valid categories array', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 1,
            maxLength: 10,
          }),
          (feedUrl, updateInterval, categories) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should pass validation with valid language code', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'),
          (feedUrl, updateInterval, language) => {
            const template = {
              feedUrl,
              updateInterval,
              language,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should pass validation with valid maxItems', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.integer({ min: 1, max: 1000 }),
          (feedUrl, updateInterval, maxItems) => {
            const template = {
              feedUrl,
              updateInterval,
              maxItems,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should pass validation with valid timeout', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.integer({ min: 1000, max: 60000 }),
          (feedUrl, updateInterval, timeout) => {
            const template = {
              feedUrl,
              updateInterval,
              timeout,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should pass validation with all optional fields', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh'),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1000, max: 60000 }),
          (
            feedUrl,
            updateInterval,
            categories,
            language,
            maxItems,
            timeout,
          ) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
              language,
              maxItems,
              timeout,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when categories is not an array', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          (feedUrl, updateInterval, categories) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
              'Invalid value for categories: must be an array',
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when language is not a string', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
          (feedUrl, updateInterval, language) => {
            const template = {
              feedUrl,
              updateInterval,
              language,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
              'Invalid value for language: must be a string',
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when maxItems is not a positive integer', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.double({ noInteger: true }),
            fc.string(),
            fc.boolean(),
          ),
          (feedUrl, updateInterval, maxItems) => {
            const template = {
              feedUrl,
              updateInterval,
              maxItems,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((err) => err.includes('maxItems'))).toBe(
              true,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation when timeout is not a positive integer', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.double({ noInteger: true }),
            fc.string(),
            fc.boolean(),
          ),
          (feedUrl, updateInterval, timeout) => {
            const template = {
              feedUrl,
              updateInterval,
              timeout,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((err) => err.includes('timeout'))).toBe(
              true,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: JSON syntax validation
   * Validates: Requirements 3.3, 3.6
   *
   * Property: Validator correctly identifies valid vs invalid JSON objects
   */
  describe('Property 3: JSON syntax validation', () => {
    it('should pass validation for valid JSON objects', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for non-object values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
          ),
          (template) => {
            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain(
              'Template must be a valid JSON object',
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: URL validation
   * Validates: Requirements 5.1
   *
   * Property: Validator correctly identifies valid HTTP/HTTPS URLs
   */
  describe('Property 4: URL validation', () => {
    it('should pass validation for valid HTTP/HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().filter((s) => !s.match(/^https?:\/\/.+/i)),
            fc.constant(''),
            fc.constant('not-a-url'),
            fc.constant('ftp://example.com'),
          ),
          fc.integer({ min: 1, max: 86400 }),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((err) => err.includes('feedUrl'))).toBe(
              true,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Positive integer validation
   * Validates: Requirements 5.2, 5.5, 5.6
   *
   * Property: Validator correctly identifies positive integers
   */
  describe('Property 5: Positive integer validation', () => {
    it('should pass validation for positive integers in updateInterval', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 1000000 }),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for non-positive integers in updateInterval', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.double({ noInteger: true }),
            fc.string(),
          ),
          (feedUrl, updateInterval) => {
            const template = {
              feedUrl,
              updateInterval,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(
              result.errors.some((err) => err.includes('updateInterval')),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Categories array validation
   * Validates: Requirements 5.3
   *
   * Property: Validator correctly identifies arrays of strings
   */
  describe('Property 6: Categories array validation', () => {
    it('should pass validation for arrays of strings', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.array(fc.string({ minLength: 1 }), {
            minLength: 0,
            maxLength: 20,
          }),
          (feedUrl, updateInterval, categories) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for non-array categories', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          (feedUrl, updateInterval, categories) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(
              result.errors.some((err) => err.includes('categories')),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for arrays with non-string elements', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.array(fc.oneof(fc.integer(), fc.boolean()), { minLength: 1 }),
          (feedUrl, updateInterval, categories) => {
            const template = {
              feedUrl,
              updateInterval,
              categories,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(
              result.errors.some((err) => err.includes('categories')),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: ISO 639-1 language validation
   * Validates: Requirements 5.4
   *
   * Property: Validator correctly identifies ISO 639-1 format (2 lowercase letters)
   */
  describe('Property 7: ISO 639-1 language validation', () => {
    it('should pass validation for valid ISO 639-1 codes', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.constantFrom(
            'en',
            'es',
            'fr',
            'de',
            'it',
            'pt',
            'ja',
            'zh',
            'ar',
            'ru',
            'ko',
            'hi',
          ),
          (feedUrl, updateInterval, language) => {
            const template = {
              feedUrl,
              updateInterval,
              language,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should fail validation for invalid language codes', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }),
            fc.string({ minLength: 3, maxLength: 10 }),
            fc.constant('EN'),
            fc.constant('e1'),
            fc.integer(),
          ),
          (feedUrl, updateInterval, language) => {
            const template = {
              feedUrl,
              updateInterval,
              language,
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((err) => err.includes('language'))).toBe(
              true,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Metadata extraction
   * Validates: Requirements 3.8, 9.2, 9.3
   *
   * Property: Templates with metadata preserve it correctly
   */
  describe('Property 8: Metadata extraction', () => {
    it('should pass validation with metadata present', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          (feedUrl, updateInterval, name, description) => {
            const template = {
              feedUrl,
              updateInterval,
              metadata: {
                name,
                description,
              },
            };

            const result = validator.validate(template);

            expect(result.isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Metadata exclusion on save
   * Validates: Requirements 9.7
   *
   * Property: Metadata is excluded when preparing for database
   * Note: This tests TemplateConfiguration.withoutMetadata()
   */
  describe('Property 9: Metadata exclusion on save', () => {
    it('should exclude metadata when calling withoutMetadata()', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
          fc.constantFrom('specific' as const, 'generic' as const),
          (feedUrl, updateInterval, name, description, type) => {
            const metadata = TemplateMetadata.create({
              name,
              description,
              type,
            });

            const config = TemplateConfiguration.create({
              feedUrl,
              updateInterval,
              metadata,
            });

            const configWithoutMetadata = config.withoutMetadata();

            expect(configWithoutMetadata.metadata).toBeUndefined();
            expect(configWithoutMetadata.feedUrl).toBe(feedUrl);
            expect(configWithoutMetadata.updateInterval).toBe(updateInterval);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve all other fields when excluding metadata', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1, max: 86400 }),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          fc.constantFrom('en', 'es', 'fr', 'de'),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1000, max: 30000 }),
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
          fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
          fc.constantFrom('specific' as const, 'generic' as const),
          (
            feedUrl,
            updateInterval,
            categories,
            language,
            maxItems,
            timeout,
            name,
            description,
            type,
          ) => {
            const metadata = TemplateMetadata.create({
              name,
              description,
              type,
            });

            const config = TemplateConfiguration.create({
              feedUrl,
              updateInterval,
              categories,
              language,
              maxItems,
              timeout,
              metadata,
            });

            const configWithoutMetadata = config.withoutMetadata();

            expect(configWithoutMetadata.metadata).toBeUndefined();
            expect(configWithoutMetadata.feedUrl).toBe(feedUrl);
            expect(configWithoutMetadata.updateInterval).toBe(updateInterval);
            expect(configWithoutMetadata.categories).toEqual(categories);
            expect(configWithoutMetadata.language).toBe(language);
            expect(configWithoutMetadata.maxItems).toBe(maxItems);
            expect(configWithoutMetadata.timeout).toBe(timeout);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Validation error messages
   * Validates: Requirements 5.7, 10.2, 10.3, 10.4
   *
   * Property: Invalid templates generate clear error messages
   */
  describe('Property 10: Validation error messages', () => {
    it('should provide clear error messages for missing required fields', () => {
      fc.assert(
        fc.property(fc.constant({}), (template) => {
          const result = validator.validate(template);

          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors.every((err) => typeof err === 'string')).toBe(
            true,
          );
          expect(result.errors.every((err) => err.length > 0)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should provide clear error messages for invalid field types', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (feedUrl, updateInterval) => {
          const template = {
            feedUrl,
            updateInterval,
          };

          const result = validator.validate(template);

          if (!result.isValid) {
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.every((err) => typeof err === 'string')).toBe(
              true,
            );
            expect(result.errors.every((err) => err.length > 0)).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should provide field-specific error messages', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ feedUrl: 'invalid', updateInterval: 1 }),
            fc.constant({ feedUrl: 'http://example.com', updateInterval: -1 }),
            fc.constant({
              feedUrl: 'http://example.com',
              updateInterval: 1,
              categories: 'not-array',
            }),
            fc.constant({
              feedUrl: 'http://example.com',
              updateInterval: 1,
              language: 'invalid',
            }),
          ),
          (template) => {
            const result = validator.validate(template);

            if (!result.isValid) {
              expect(result.errors.length).toBeGreaterThan(0);
              // Each error should mention the field name
              expect(
                result.errors.some(
                  (err) =>
                    err.includes('feedUrl') ||
                    err.includes('updateInterval') ||
                    err.includes('categories') ||
                    err.includes('language'),
                ),
              ).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
