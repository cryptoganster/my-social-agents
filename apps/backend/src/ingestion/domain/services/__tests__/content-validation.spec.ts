import * as fc from 'fast-check';
import { ContentValidationService } from '../content-validation';
import { ContentMetadata } from '../../value-objects';
import { ContentItem } from '../../aggregates';
import { ContentHash } from '../../value-objects';

describe('ContentValidationService', () => {
  let service: ContentValidationService;

  beforeEach(() => {
    service = new ContentValidationService();
  });

  describe('meetsMinimumLength', () => {
    it('should return false for empty content', () => {
      expect(service.meetsMinimumLength('')).toBe(false);
    });

    it('should return false for content shorter than minimum', () => {
      expect(service.meetsMinimumLength('short')).toBe(false);
    });

    it('should return true for content meeting minimum length', () => {
      expect(service.meetsMinimumLength('This is long enough content')).toBe(
        true,
      );
    });

    it('should return false for whitespace-only content', () => {
      expect(service.meetsMinimumLength('          ')).toBe(false);
    });
  });

  describe('hasValidEncoding', () => {
    it('should return true for valid UTF-8 content', () => {
      expect(service.hasValidEncoding('Valid UTF-8 content')).toBe(true);
    });

    it('should return true for content with Unicode characters', () => {
      expect(service.hasValidEncoding('Content with émojis 🎉')).toBe(true);
    });

    it('should return false for content with replacement characters', () => {
      expect(service.hasValidEncoding('Invalid \uFFFD content')).toBe(false);
    });

    it('should return false for excessive control characters', () => {
      const controlChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08';
      expect(service.hasValidEncoding(controlChars)).toBe(false);
    });

    it('should return true for content with normal newlines and tabs', () => {
      expect(service.hasValidEncoding('Line 1\nLine 2\tTabbed')).toBe(true);
    });
  });

  describe('hasRequiredMetadata', () => {
    it('should return true for metadata with title', () => {
      const metadata = ContentMetadata.create({ title: 'Test Title' });
      expect(service.hasRequiredMetadata(metadata)).toBe(true);
    });

    it('should return true for metadata with sourceUrl', () => {
      const metadata = ContentMetadata.create({
        sourceUrl: 'https://example.com',
      });
      expect(service.hasRequiredMetadata(metadata)).toBe(true);
    });

    it('should return false for empty metadata', () => {
      const metadata = ContentMetadata.empty();
      expect(service.hasRequiredMetadata(metadata)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate a valid ContentItem', () => {
      const item = ContentItem.create({
        contentId: 'test-id',
        sourceId: 'source-id',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'This is valid content for testing',
        normalizedContent: 'This is valid content for testing',
        metadata: ContentMetadata.create({ title: 'Test' }),
        assetTags: [],
        collectedAt: new Date(),
      });

      const result = service.validate(item);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject content that is too short', () => {
      const item = ContentItem.reconstitute({
        contentId: 'test-id',
        sourceId: 'source-id',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'Short',
        normalizedContent: 'Short',
        metadata: ContentMetadata.create({ title: 'Test' }),
        assetTags: [],
        collectedAt: new Date(),
      });

      const result = service.validate(item);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('too short'))).toBe(true);
    });

    it('should reject content with missing metadata', () => {
      const item = ContentItem.reconstitute({
        contentId: 'test-id',
        sourceId: 'source-id',
        contentHash: ContentHash.create('a'.repeat(64)),
        rawContent: 'This is valid content for testing',
        normalizedContent: 'This is valid content for testing',
        metadata: ContentMetadata.empty(),
        assetTags: [],
        collectedAt: new Date(),
      });

      const result = service.validate(item);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('metadata'))).toBe(true);
    });
  });

  describe('validateQuality', () => {
    it('should validate quality content', () => {
      const content = 'This is quality content for testing';
      const metadata = ContentMetadata.create({ title: 'Test' });

      const result = service.validateQuality(content, metadata);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject low quality content', () => {
      const content = 'bad';
      const metadata = ContentMetadata.empty();

      const result = service.validateQuality(content, metadata);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // Feature: content-ingestion, Property 19: Content Quality Validation
  // **Validates: Requirements 7.1, 7.4, 7.5**
  describe('Property 19: Content Quality Validation', () => {
    it('should reject content below minimum length threshold', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 9 }), // Below minimum of 10
          (shortContent) => {
            const result = service.meetsMinimumLength(shortContent);
            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept content meeting minimum length threshold', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          (validContent) => {
            // Filter out whitespace-only strings
            if (validContent.trim().length < 10) return;

            const result = service.meetsMinimumLength(validContent);
            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject content with missing required metadata', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }).filter((s) => {
            // Filter to ensure valid content that would pass other checks
            const trimmed = s.trim();
            // Must have meaningful length
            if (trimmed.length < 10) return false;
            // Must not have excessive control characters
            const controlCharCount = (
              s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []
            ).length;
            if (controlCharCount / s.length > 0.1) return false;
            // Must not have replacement characters
            if (s.includes('\uFFFD')) return false;
            return true;
          }),
          (content) => {
            const emptyMetadata = ContentMetadata.empty();
            const result = service.validateQuality(content, emptyMetadata);

            // Should fail validation
            expect(result.isValid).toBe(false);
            // Should have at least one error
            expect(result.errors.length).toBeGreaterThan(0);
            // One of the errors should be about metadata
            const hasMetadataError = result.errors.some((e) =>
              e.toLowerCase().includes('metadata'),
            );
            expect(hasMetadataError).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept content with valid metadata', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.webUrl()),
          (content, metadataValue) => {
            // Filter out whitespace-only content
            if (content.trim().length < 10) return;

            // Create metadata with either title or URL
            const metadata = metadataValue.startsWith('http')
              ? ContentMetadata.create({ sourceUrl: metadataValue })
              : ContentMetadata.create({ title: metadataValue });

            const result = service.validateQuality(content, metadata);

            // Should pass metadata validation (may fail on other criteria)
            const hasMetadataError = result.errors.some((e) =>
              e.includes('metadata'),
            );
            expect(hasMetadataError).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should reject whitespace-only content', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), (whitespaceCount) => {
          const whitespaceContent = ' '.repeat(whitespaceCount);
          const metadata = ContentMetadata.create({ title: 'Test' });

          const result = service.validateQuality(whitespaceContent, metadata);

          expect(result.isValid).toBe(false);
          expect(
            result.errors.some(
              (e) => e.includes('empty') || e.includes('whitespace'),
            ),
          ).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate content with valid encoding', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10, maxLength: 100 }), (content) => {
          // Filter out strings with replacement characters
          if (content.includes('\uFFFD')) return;

          // Filter out strings with excessive control characters
          const controlCharCount = (
            content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []
          ).length;
          if (controlCharCount / content.length > 0.1) return;

          const result = service.hasValidEncoding(content);
          expect(result).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should reject content exceeding maximum length', () => {
      fc.assert(
        fc.property(
          fc.constant(service.getMaximumLength() + 1),
          (excessiveLength) => {
            const longContent = 'a'.repeat(excessiveLength);
            const metadata = ContentMetadata.create({ title: 'Test' });

            const result = service.validateQuality(longContent, metadata);

            expect(result.isValid).toBe(false);
            expect(
              result.errors.some((e) => e.includes('exceeds maximum')),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should provide detailed error messages for invalid content', () => {
      fc.assert(
        fc.property(
          fc.record({
            content: fc.string({ maxLength: 5 }), // Too short
            hasMetadata: fc.boolean(),
          }),
          (testCase) => {
            const metadata = testCase.hasMetadata
              ? ContentMetadata.create({ title: 'Test' })
              : ContentMetadata.empty();

            const result = service.validateQuality(testCase.content, metadata);

            if (!result.isValid) {
              // Should have at least one error
              expect(result.errors.length).toBeGreaterThan(0);

              // Each error should be a non-empty string
              result.errors.forEach((error) => {
                expect(typeof error).toBe('string');
                expect(error.length).toBeGreaterThan(0);
              });
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should validate ContentItem aggregates consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            content: fc.string({ minLength: 10, maxLength: 100 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (testCase) => {
            // Filter out whitespace-only content
            if (testCase.content.trim().length < 10) return;

            const item = ContentItem.reconstitute({
              contentId: 'test-id',
              sourceId: 'source-id',
              contentHash: ContentHash.create('a'.repeat(64)),
              rawContent: testCase.content,
              normalizedContent: testCase.content,
              metadata: ContentMetadata.create({ title: testCase.title }),
              assetTags: [],
              collectedAt: new Date(),
            });

            const result = service.validate(item);

            // Valid content should pass validation
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
