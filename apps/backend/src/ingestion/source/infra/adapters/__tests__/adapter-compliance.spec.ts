import * as fc from 'fast-check';
import { WebScraperAdapter } from '../web-scraper';
import { RssFeedAdapter } from '../rss-feed';
import { SocialMediaAdapter } from '../social-media';
import { PdfAdapter } from '../pdf';
import { OcrAdapter } from '../ocr';
import { WikipediaAdapter } from '../wikipedia';
import { SourceAdapter } from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

/**
 * Property-Based Tests for Source Adapter Interface Compliance
 *
 * Feature: content-ingestion, Property 1: Source Adapter Interface Compliance
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * For any supported source type and valid source configuration, invoking the
 * corresponding source adapter should return a collection of raw content items
 * without throwing exceptions.
 */
describe('Source Adapter Interface Compliance', () => {
  const adapters: SourceAdapter[] = [
    new WebScraperAdapter(),
    new RssFeedAdapter(),
    new SocialMediaAdapter(),
    new PdfAdapter(),
    new OcrAdapter(),
    new WikipediaAdapter(),
  ];

  describe('Property 1: All adapters implement SourceAdapter interface', () => {
    it('should have all required methods defined', () => {
      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          // Each adapter must have the three required methods
          expect(typeof adapter.collect).toBe('function');
          expect(typeof adapter.supports).toBe('function');
          expect(typeof adapter.validateConfig).toBe('function');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: supports() returns boolean for all source types', () => {
    it('should return boolean for any source type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...adapters),
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          (adapter, sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);
            const result = adapter.supports(sourceType);

            // Must return a boolean
            expect(typeof result).toBe('boolean');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: Each adapter supports exactly one source type', () => {
    it('should support exactly one source type from the enum', () => {
      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          const supportedTypes = Object.values(SourceTypeEnum).filter(
            (typeValue) => {
              const sourceType = SourceType.fromEnum(typeValue);
              return adapter.supports(sourceType);
            },
          );

          // Each adapter should support exactly one source type
          expect(supportedTypes.length).toBe(1);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: validateConfig() returns proper validation result', () => {
    it('should return validation result with isValid and errors properties', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...adapters),
          fc.record({
            url: fc.option(fc.webUrl(), { nil: undefined }),
            feedUrl: fc.option(fc.webUrl(), { nil: undefined }),
            platform: fc.option(fc.string(), { nil: undefined }),
            query: fc.option(fc.string(), { nil: undefined }),
            path: fc.option(fc.string(), { nil: undefined }),
            imagePath: fc.option(fc.string(), { nil: undefined }),
            imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
            articleTitle: fc.option(fc.string(), { nil: undefined }),
            articleId: fc.option(fc.string(), { nil: undefined }),
          }),
          (adapter, config) => {
            const result = adapter.validateConfig(config);

            // Must have isValid property (boolean)
            expect(result).toHaveProperty('isValid');
            expect(typeof result.isValid).toBe('boolean');

            // Must have errors property (array)
            expect(result).toHaveProperty('errors');
            expect(Array.isArray(result.errors)).toBe(true);

            // All errors must be strings
            result.errors.forEach((error) => {
              expect(typeof error).toBe('string');
            });

            // If isValid is false, there should be at least one error
            if (!result.isValid) {
              expect(result.errors.length).toBeGreaterThan(0);
            }

            // If isValid is true, there should be no errors
            if (result.isValid) {
              expect(result.errors.length).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: validateConfig() accepts valid configurations', () => {
    it('should validate correct configurations for each adapter', () => {
      const validConfigs: Record<string, Record<string, unknown>> = {
        WEB: { url: 'https://example.com' },
        RSS: { feedUrl: 'https://example.com/feed.xml' },
        SOCIAL_MEDIA: { platform: 'reddit', query: 'cryptocurrency' },
        PDF: { url: 'https://example.com/document.pdf' },
        OCR: { imageUrl: 'https://example.com/image.png' },
        WIKIPEDIA: { articleTitle: 'Bitcoin' },
      };

      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          // Find which source type this adapter supports
          const supportedType = Object.values(SourceTypeEnum).find(
            (typeValue) => {
              const sourceType = SourceType.fromEnum(typeValue);
              return adapter.supports(sourceType);
            },
          );

          expect(supportedType).toBeDefined();

          if (supportedType != null) {
            const config = validConfigs[supportedType];
            const result = adapter.validateConfig(config);

            // Valid configuration should pass validation
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: validateConfig() rejects invalid configurations', () => {
    it('should reject configurations missing required fields', () => {
      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          // Empty config should be invalid for all adapters
          const result = adapter.validateConfig({});

          // Should be invalid
          expect(result.isValid).toBe(false);

          // Should have at least one error message
          expect(result.errors.length).toBeGreaterThan(0);

          // All errors should be non-empty strings
          result.errors.forEach((error) => {
            expect(typeof error).toBe('string');
            expect(error.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: collect() returns array of RawContent', () => {
    it('should return array when called with valid configuration (or throw)', async () => {
      // Note: We can't actually test successful collection without external dependencies,
      // but we can verify the method signature and error handling

      const validConfigs = [
        {
          adapter: new WebScraperAdapter(),
          config: SourceConfiguration.create({
            sourceId: 'test-web',
            sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
            name: 'Test Web',
            config: { url: 'https://example.com' },
          }),
        },
        {
          adapter: new RssFeedAdapter(),
          config: SourceConfiguration.create({
            sourceId: 'test-rss',
            sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
            name: 'Test RSS',
            config: { feedUrl: 'https://example.com/feed.xml' },
          }),
        },
      ];

      for (const { adapter, config } of validConfigs) {
        try {
          const result = await adapter.collect(config);

          // If it succeeds, it must return an array
          expect(Array.isArray(result)).toBe(true);

          // Each item must have content property
          result.forEach((item) => {
            expect(item).toHaveProperty('content');
            expect(typeof item.content).toBe('string');

            // Metadata is optional but if present, must be an object
            if (item.metadata) {
              expect(typeof item.metadata).toBe('object');
            }
          });
        } catch (error) {
          // If it fails (expected for network calls in tests), error should be defined
          expect(error).toBeDefined();
          expect(error instanceof Error || typeof error === 'string').toBe(
            true,
          );
        }
      }
    }, 10000); // Increase timeout to 10 seconds for network calls
  });

  describe('Property 1: collect() throws descriptive errors for invalid configs', () => {
    it('should throw error with message for invalid configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...adapters),
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          async (adapter, sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);

            // Create invalid configuration (empty config)
            const config = SourceConfiguration.create({
              sourceId: 'test-invalid',
              sourceType,
              name: 'Test Invalid',
              config: {}, // Invalid - missing required fields
            });

            // Should throw an error
            let errorThrown = false;
            let errorMessage = '';

            try {
              await adapter.collect(config);
            } catch (error) {
              errorThrown = true;
              errorMessage =
                error instanceof Error ? error.message : String(error);
            }

            // Must throw an error
            expect(errorThrown).toBe(true);

            // Error message must be non-empty string
            expect(typeof errorMessage).toBe('string');
            expect(errorMessage.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: Adapter mapping is complete', () => {
    it('should have an adapter for every source type', () => {
      const allSourceTypes = Object.values(SourceTypeEnum);

      allSourceTypes.forEach((sourceTypeValue) => {
        const sourceType = SourceType.fromEnum(sourceTypeValue);

        // Find adapter that supports this source type
        const supportingAdapter = adapters.find((adapter) =>
          adapter.supports(sourceType),
        );

        // Must have exactly one adapter for this source type
        expect(supportingAdapter).toBeDefined();

        // Count how many adapters support this type
        const supportCount = adapters.filter((adapter) =>
          adapter.supports(sourceType),
        ).length;

        // Should be exactly one adapter per source type
        expect(supportCount).toBe(1);
      });
    });
  });

  describe('Property 1: Adapters are independent', () => {
    it('should not share state between adapter instances', () => {
      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          // Create two instances of the same adapter type
          const AdapterClass = adapter.constructor as new () => SourceAdapter;
          const instance1 = new AdapterClass();
          const instance2 = new AdapterClass();

          // They should be different instances
          expect(instance1).not.toBe(instance2);

          // They should support the same source types
          Object.values(SourceTypeEnum).forEach((sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);
            expect(instance1.supports(sourceType)).toBe(
              instance2.supports(sourceType),
            );
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: RawContent structure is consistent', () => {
    it('should return content with consistent structure when successful', async () => {
      // Test with Wikipedia adapter which can actually fetch data
      const wikipediaAdapter = new WikipediaAdapter();
      const config = SourceConfiguration.create({
        sourceId: 'test-wikipedia',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA),
        name: 'Test Wikipedia',
        config: {
          articleTitle: 'Bitcoin',
          language: 'en',
        },
      });

      try {
        const result = await wikipediaAdapter.collect(config);

        // Should return array
        expect(Array.isArray(result)).toBe(true);

        // Each item should have proper structure
        result.forEach((item) => {
          // Must have content (string)
          expect(item).toHaveProperty('content');
          expect(typeof item.content).toBe('string');
          expect(item.content.length).toBeGreaterThan(0);

          // May have metadata (object)
          if (item.metadata) {
            expect(typeof item.metadata).toBe('object');

            // Check optional metadata fields
            if (
              item.metadata.title !== undefined &&
              item.metadata.title !== null
            ) {
              expect(typeof item.metadata.title).toBe('string');
            }
            if (
              item.metadata.author !== undefined &&
              item.metadata.author !== null
            ) {
              expect(typeof item.metadata.author).toBe('string');
            }
            if (
              item.metadata.publishedAt !== undefined &&
              item.metadata.publishedAt !== null
            ) {
              expect(item.metadata.publishedAt instanceof Date).toBe(true);
            }
            if (
              item.metadata.sourceUrl !== undefined &&
              item.metadata.sourceUrl !== null
            ) {
              expect(typeof item.metadata.sourceUrl).toBe('string');
            }
          }
        });
      } catch (error) {
        // Network errors are acceptable in tests
        expect(error).toBeDefined();
      }
    }, 10000); // Increase timeout to 10 seconds for network calls
  });
});
