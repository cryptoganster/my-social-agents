import * as fc from 'fast-check';
import { WebScraperAdapter } from '../web-scraper';
import { RssFeedAdapter } from '../rss-feed';
import { SocialMediaAdapter } from '../social-media';
import { PdfAdapter } from '../pdf';
import { OcrAdapter } from '../ocr';
import { WikipediaAdapter } from '../wikipedia';
import { SourceAdapter } from '@/ingestion/source/domain/interfaces/source-adapter';
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

  const adapterTypeMap = new Map<string, SourceTypeEnum>([
    ['WebScraperAdapter', SourceTypeEnum.WEB],
    ['RssFeedAdapter', SourceTypeEnum.RSS],
    ['SocialMediaAdapter', SourceTypeEnum.SOCIAL_MEDIA],
    ['PdfAdapter', SourceTypeEnum.PDF],
    ['OcrAdapter', SourceTypeEnum.OCR],
    ['WikipediaAdapter', SourceTypeEnum.WIKIPEDIA],
  ]);

  describe('Property 1: Adapter supports() method correctness', () => {
    it('should return true only for its designated source type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(SourceTypeEnum)),
          (sourceTypeValue) => {
            const sourceType = SourceType.fromEnum(sourceTypeValue);

            for (const adapter of adapters) {
              const adapterName = adapter.constructor.name;
              const expectedSourceType = adapterTypeMap.get(adapterName);
              const shouldSupport = expectedSourceType === sourceTypeValue;
              const actuallySupports = adapter.supports(sourceType);

              // Each adapter should only support its designated source type
              expect(actuallySupports).toBe(shouldSupport);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: Adapter validateConfig() returns valid structure', () => {
    it('should return AdapterValidationResult with isValid and errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...adapters),
          fc.record({
            url: fc.option(fc.webUrl(), { nil: undefined }),
            feedUrl: fc.option(fc.webUrl(), { nil: undefined }),
            platform: fc.option(fc.constantFrom('twitter', 'reddit'), {
              nil: undefined,
            }),
            path: fc.option(fc.string(), { nil: undefined }),
            imagePath: fc.option(fc.string(), { nil: undefined }),
            articleTitle: fc.option(fc.string(), { nil: undefined }),
          }),
          (adapter, config) => {
            const result = adapter.validateConfig(config);

            // Result must have the correct structure
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);

            // If invalid, must have at least one error
            if (!result.isValid) {
              expect(result.errors.length).toBeGreaterThan(0);
            }

            // If valid, should have no errors
            if (result.isValid) {
              expect(result.errors.length).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: Valid configurations pass validation', () => {
    it('should validate correct WebScraperAdapter config', () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const adapter = new WebScraperAdapter();
          const result = adapter.validateConfig({ url });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct RssFeedAdapter config', () => {
      fc.assert(
        fc.property(fc.webUrl(), (feedUrl) => {
          const adapter = new RssFeedAdapter();
          const result = adapter.validateConfig({ feedUrl });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct SocialMediaAdapter config', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('twitter', 'x', 'reddit'),
          fc.string({ minLength: 1 }),
          (platform, query) => {
            const adapter = new SocialMediaAdapter();
            const result = adapter.validateConfig({ platform, query });

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should validate correct PdfAdapter config with URL', () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const adapter = new PdfAdapter();
          const result = adapter.validateConfig({ url });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct PdfAdapter config with path', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (path) => {
          const adapter = new PdfAdapter();
          const result = adapter.validateConfig({ path });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct OcrAdapter config with URL', () => {
      fc.assert(
        fc.property(fc.webUrl(), (imageUrl) => {
          const adapter = new OcrAdapter();
          const result = adapter.validateConfig({ imageUrl });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct OcrAdapter config with path', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (imagePath) => {
          const adapter = new OcrAdapter();
          const result = adapter.validateConfig({ imagePath });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct WikipediaAdapter config with title', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (articleTitle) => {
          const adapter = new WikipediaAdapter();
          const result = adapter.validateConfig({ articleTitle });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should validate correct WikipediaAdapter config with ID', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (articleId) => {
          const adapter = new WikipediaAdapter();
          const result = adapter.validateConfig({ articleId });

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 1: Invalid configurations fail validation', () => {
    it('should reject WebScraperAdapter config without URL', () => {
      const adapter = new WebScraperAdapter();
      const result = adapter.validateConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject RssFeedAdapter config without feedUrl', () => {
      const adapter = new RssFeedAdapter();
      const result = adapter.validateConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject SocialMediaAdapter config without platform', () => {
      const adapter = new SocialMediaAdapter();
      const result = adapter.validateConfig({ query: 'test' });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject PdfAdapter config without path or url', () => {
      const adapter = new PdfAdapter();
      const result = adapter.validateConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject OcrAdapter config without imagePath or imageUrl', () => {
      const adapter = new OcrAdapter();
      const result = adapter.validateConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject WikipediaAdapter config without articleTitle or articleId', () => {
      const adapter = new WikipediaAdapter();
      const result = adapter.validateConfig({});

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Property 1: Adapter interface method existence', () => {
    it('should have all required interface methods', () => {
      fc.assert(
        fc.property(fc.constantFrom(...adapters), (adapter) => {
          // Check that all required methods exist
          expect(typeof adapter.collect).toBe('function');
          expect(typeof adapter.supports).toBe('function');
          expect(typeof adapter.validateConfig).toBe('function');
        }),
        { numRuns: 100 },
      );
    });
  });
});
