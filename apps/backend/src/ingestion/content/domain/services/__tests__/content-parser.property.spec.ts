import * as fc from 'fast-check';
import { ContentParser } from '../content-parser';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { IParsingStrategy } from '../../interfaces/services/parsing-strategy';

/**
 * Property-Based Tests for ContentParser
 *
 * Feature: content-parsing-strategy
 * Property 1: Strategy Selection Consistency
 * Validates: Requirements 6.4, 6.5, 6.6
 *
 * These tests verify that strategy selection is deterministic and consistent.
 */
describe('ContentParser - Property-Based Tests', () => {
  // Mock strategy classes with proper names
  class MockHtmlParsingStrategy implements IParsingStrategy {
    parse = jest.fn().mockResolvedValue('parsed by HtmlParsingStrategy');
    extractMetadata = jest.fn().mockResolvedValue({ title: 'HTML' });
  }

  class MockRssParsingStrategy implements IParsingStrategy {
    parse = jest.fn().mockResolvedValue('parsed by RssParsingStrategy');
    extractMetadata = jest.fn().mockResolvedValue({ title: 'RSS' });
  }

  /**
   * Property 1: Strategy Selection Consistency
   *
   * For any source type, the same strategy should always be selected.
   * This ensures deterministic behavior across multiple calls.
   *
   * Validates: Requirements 6.4, 6.5, 6.6
   */
  describe('Property 1: Strategy Selection Consistency', () => {
    // Source types that have registered strategies
    const supportedSourceTypes = [
      SourceTypeEnum.WEB,
      SourceTypeEnum.RSS,
      SourceTypeEnum.SOCIAL_MEDIA,
      SourceTypeEnum.WIKIPEDIA,
    ];

    // Generator for supported source types
    const supportedSourceTypeArb = fc.constantFrom(...supportedSourceTypes);

    it('should always select the same strategy for the same source type', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          supportedSourceTypeArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          async (sourceTypeEnum, content) => {
            const sourceType = SourceType.fromEnum(sourceTypeEnum);

            // Parse twice with the same source type
            const result1 = await parser.parse(content, sourceType);
            const result2 = await parser.parse(content, sourceType);

            // The parser name should be the same
            expect(result1.parsingInfo.parser).toBe(result2.parsingInfo.parser);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should select HtmlParsingStrategy for WEB source type', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
            const result = await parser.parse(content, sourceType);

            expect(result.parsingInfo.parser).toBe('MockHtmlParsingStrategy');
            expect(result.parsingInfo.originalFormat).toBe('text/html');
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should select RssParsingStrategy for RSS source type', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
            const result = await parser.parse(content, sourceType);

            expect(result.parsingInfo.parser).toBe('MockRssParsingStrategy');
            expect(result.parsingInfo.originalFormat).toBe(
              'application/rss+xml',
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should select HtmlParsingStrategy for SOCIAL_MEDIA source type', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA);
            const result = await parser.parse(content, sourceType);

            expect(result.parsingInfo.parser).toBe('MockHtmlParsingStrategy');
            expect(result.parsingInfo.originalFormat).toBe('text/html');
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should select HtmlParsingStrategy for WIKIPEDIA source type', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (content) => {
            const sourceType = SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA);
            const result = await parser.parse(content, sourceType);

            expect(result.parsingInfo.parser).toBe('MockHtmlParsingStrategy');
            expect(result.parsingInfo.originalFormat).toBe('text/html');
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property 2: Unsupported Source Types Always Throw
   *
   * For any source type without a registered strategy, parsing should throw.
   *
   * Validates: Requirements 6.7
   */
  describe('Property 2: Unsupported Source Types Always Throw', () => {
    // Source types that don't have registered strategies
    const unsupportedSourceTypes = [SourceTypeEnum.PDF, SourceTypeEnum.OCR];

    // Generator for unsupported source types
    const unsupportedSourceTypeArb = fc.constantFrom(...unsupportedSourceTypes);

    it('should always throw UnsupportedSourceTypeError for unsupported types', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          unsupportedSourceTypeArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          async (sourceTypeEnum, content) => {
            const sourceType = SourceType.fromEnum(sourceTypeEnum);

            await expect(parser.parse(content, sourceType)).rejects.toThrow(
              'No parsing strategy registered for source type',
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property 3: Parsing Time is Always Non-Negative
   *
   * For any valid parse operation, the conversion time should be >= 0.
   *
   * Validates: Requirements 6.8
   */
  describe('Property 3: Parsing Time is Always Non-Negative', () => {
    const supportedSourceTypes = [
      SourceTypeEnum.WEB,
      SourceTypeEnum.RSS,
      SourceTypeEnum.SOCIAL_MEDIA,
      SourceTypeEnum.WIKIPEDIA,
    ];

    const supportedSourceTypeArb = fc.constantFrom(...supportedSourceTypes);

    it('should always report non-negative conversion time', async () => {
      const htmlStrategy = new MockHtmlParsingStrategy();
      const rssStrategy = new MockRssParsingStrategy();

      const parser = new ContentParser(htmlStrategy, rssStrategy);

      await fc.assert(
        fc.asyncProperty(
          supportedSourceTypeArb,
          fc.string({ minLength: 0, maxLength: 500 }),
          async (sourceTypeEnum, content) => {
            const sourceType = SourceType.fromEnum(sourceTypeEnum);
            const result = await parser.parse(content, sourceType);

            expect(result.parsingInfo.conversionTimeMs).toBeGreaterThanOrEqual(
              0,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
