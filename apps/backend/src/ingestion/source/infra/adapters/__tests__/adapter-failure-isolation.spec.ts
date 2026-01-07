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
 * Property-Based Tests for Adapter Failure Isolation
 *
 * Feature: content-ingestion, Property 20: Adapter Failure Isolation
 * Validates: Requirements 8.4
 *
 * For any source adapter that throws an exception, the failure should be isolated
 * to that adapter and should not crash the ingestion system or affect other adapters.
 */
describe('Adapter Failure Isolation', () => {
  const adapters: SourceAdapter[] = [
    new WebScraperAdapter(),
    new RssFeedAdapter(),
    new SocialMediaAdapter(),
    new PdfAdapter(),
    new OcrAdapter(),
    new WikipediaAdapter(),
  ];

  describe('Property 20: Adapter exceptions are catchable', () => {
    it('should allow catching exceptions from adapter collect() method', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...adapters),
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          async (adapter, sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);

            // Create an invalid configuration that will cause the adapter to fail
            const config = SourceConfiguration.create({
              sourceId: 'test-source-id',
              sourceType,
              name: 'Test Source',
              config: {}, // Empty config - will fail validation
            });

            // The adapter should throw an error, but it should be catchable
            let errorCaught = false;
            let errorMessage = '';

            try {
              await adapter.collect(config);
            } catch (error) {
              errorCaught = true;
              errorMessage =
                error instanceof Error ? error.message : String(error);
            }

            // We expect an error to be thrown and caught
            expect(errorCaught).toBe(true);
            expect(errorMessage).toBeTruthy();

            // The error should be a proper Error object or string
            expect(typeof errorMessage).toBe('string');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 20: Adapter failures do not affect other adapters', () => {
    it('should allow other adapters to function after one fails', async () => {
      // Create a valid configuration for WebScraperAdapter
      const validWebConfig = SourceConfiguration.create({
        sourceId: 'valid-web-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
        name: 'Valid Web Source',
        config: {
          url: 'https://example.com',
        },
      });

      // Create an invalid configuration for RssFeedAdapter
      const invalidRssConfig = SourceConfiguration.create({
        sourceId: 'invalid-rss-source',
        sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
        name: 'Invalid RSS Source',
        config: {}, // Missing feedUrl
      });

      const webAdapter = new WebScraperAdapter();
      const rssAdapter = new RssFeedAdapter();

      // First adapter (RSS) should fail
      let rssErrorCaught = false;
      try {
        await rssAdapter.collect(invalidRssConfig);
      } catch {
        rssErrorCaught = true;
      }

      expect(rssErrorCaught).toBe(true);

      // Second adapter (Web) should still be able to validate config
      // (We can't actually fetch from example.com in tests, but we can validate)
      const webValidation = webAdapter.validateConfig(validWebConfig.config);
      expect(webValidation.isValid).toBe(true);
    });
  });

  describe('Property 20: Adapter validateConfig() never throws', () => {
    it('should return validation result instead of throwing for any config', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...adapters),
          fc.record({
            url: fc.option(fc.oneof(fc.webUrl(), fc.string()), {
              nil: undefined,
            }),
            feedUrl: fc.option(fc.oneof(fc.webUrl(), fc.string()), {
              nil: undefined,
            }),
            platform: fc.option(fc.string(), { nil: undefined }),
            query: fc.option(fc.string(), { nil: undefined }),
            path: fc.option(fc.string(), { nil: undefined }),
            imagePath: fc.option(fc.string(), { nil: undefined }),
            imageUrl: fc.option(fc.oneof(fc.webUrl(), fc.string()), {
              nil: undefined,
            }),
            articleTitle: fc.option(fc.string(), { nil: undefined }),
            articleId: fc.option(fc.oneof(fc.string(), fc.integer()), {
              nil: undefined,
            }),
          }),
          (adapter, config) => {
            // validateConfig should never throw, even with invalid input
            let threwException = false;
            let result;

            try {
              result = adapter.validateConfig(config);
            } catch {
              threwException = true;
            }

            // Should not throw
            expect(threwException).toBe(false);

            // Should return a valid result structure
            expect(result).toBeDefined();
            if (result) {
              expect(result).toHaveProperty('isValid');
              expect(result).toHaveProperty('errors');
              expect(typeof result.isValid).toBe('boolean');
              expect(Array.isArray(result.errors)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 20: Adapter supports() never throws', () => {
    it('should return boolean for any source type without throwing', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...adapters),
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          (adapter, sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);

            // supports() should never throw
            let threwException = false;
            let result;

            try {
              result = adapter.supports(sourceType);
            } catch {
              threwException = true;
            }

            // Should not throw
            expect(threwException).toBe(false);

            // Should return a boolean
            expect(typeof result).toBe('boolean');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 20: Multiple adapter failures are independent', () => {
    it('should handle multiple adapter failures independently', async () => {
      const invalidConfigs = [
        SourceConfiguration.create({
          sourceId: 'invalid-web',
          sourceType: SourceType.fromEnum(SourceTypeEnum.WEB),
          name: 'Invalid Web',
          config: {}, // Missing url
        }),
        SourceConfiguration.create({
          sourceId: 'invalid-rss',
          sourceType: SourceType.fromEnum(SourceTypeEnum.RSS),
          name: 'Invalid RSS',
          config: {}, // Missing feedUrl
        }),
        SourceConfiguration.create({
          sourceId: 'invalid-pdf',
          sourceType: SourceType.fromEnum(SourceTypeEnum.PDF),
          name: 'Invalid PDF',
          config: {}, // Missing path or url
        }),
      ];

      const failureResults = await Promise.allSettled(
        invalidConfigs.map(async (config) => {
          const adapter = adapters.find((a) => a.supports(config.sourceType));
          if (!adapter) throw new Error('No adapter found');
          return adapter.collect(config);
        }),
      );

      // All should fail (rejected)
      expect(failureResults.every((r) => r.status === 'rejected')).toBe(true);

      // Each failure should have a reason
      failureResults.forEach((result) => {
        if (result.status === 'rejected') {
          expect(result.reason).toBeDefined();
        }
      });
    });
  });
});
