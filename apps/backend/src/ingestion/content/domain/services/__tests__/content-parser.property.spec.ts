import { ContentParser } from '../content-parser';
import { IParsingStrategy } from '../../interfaces/services/parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '../../value-objects/content-metadata';
import { IJsRenderingDetector } from '../../interfaces/services/js-rendering-detector';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for ContentParser Fallback Logic
 *
 * Tests fallback decision consistency and content length thresholds.
 * Requirements: 5.4
 */
describe('ContentParser Property-Based Tests', () => {
  let mockHtmlStrategy: jest.Mocked<IParsingStrategy>;
  let mockRssStrategy: jest.Mocked<IParsingStrategy>;
  let mockFirecrawlStrategy: jest.Mocked<IParsingStrategy>;
  let mockJsDetector: jest.Mocked<IJsRenderingDetector>;

  beforeEach(() => {
    mockHtmlStrategy = {
      parse: jest.fn(),
      extractMetadata: jest.fn().mockResolvedValue({}),
    };

    mockRssStrategy = {
      parse: jest.fn(),
      extractMetadata: jest.fn().mockResolvedValue({}),
    };

    mockFirecrawlStrategy = {
      parse: jest.fn().mockResolvedValue('# Firecrawl Content'),
      extractMetadata: jest.fn().mockResolvedValue({}),
    };

    mockJsDetector = {
      needsJsRendering: jest.fn(),
    };
  });

  /**
   * Property 1: Fallback decision consistency
   *
   * For any content length and JS rendering decision, the fallback
   * decision should be consistent and deterministic.
   *
   * Validates: Requirements 5.3
   */
  it('should make consistent fallback decisions for same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 500 }), // Content length
        fc.boolean(), // JS rendering needed
        fc.webUrl(), // URL
        async (contentLength, jsRenderingNeeded, url) => {
          // Create fresh mocks for each test iteration
          const freshHtmlStrategy = {
            parse: jest.fn(),
            extractMetadata: jest.fn().mockResolvedValue({}),
          };

          const freshRssStrategy = {
            parse: jest.fn(),
            extractMetadata: jest.fn().mockResolvedValue({}),
          };

          const freshFirecrawlStrategy = {
            parse: jest.fn().mockResolvedValue('# Firecrawl Content'),
            extractMetadata: jest.fn().mockResolvedValue({}),
          };

          const freshJsDetector = {
            needsJsRendering: jest.fn(),
          };

          const contentParser = new ContentParser(
            freshHtmlStrategy,
            freshRssStrategy,
            freshFirecrawlStrategy,
            freshJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const markdown = 'A'.repeat(contentLength);
          freshHtmlStrategy.parse.mockResolvedValue(markdown);
          freshJsDetector.needsJsRendering.mockReturnValue(jsRenderingNeeded);

          // Parse twice with same inputs
          await contentParser.parse('<html></html>', sourceType, metadata);
          const firecrawlCalls1 =
            freshFirecrawlStrategy.parse.mock.calls.length;

          // Reset only the Firecrawl mock call count
          freshFirecrawlStrategy.parse.mockClear();

          await contentParser.parse('<html></html>', sourceType, metadata);
          const firecrawlCalls2 =
            freshFirecrawlStrategy.parse.mock.calls.length;

          // Should make same decision both times
          expect(firecrawlCalls1).toBe(firecrawlCalls2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Content length threshold
   *
   * For any content with length >= 200, fallback should never be triggered
   * regardless of JS rendering detection.
   *
   * Validates: Requirements 5.3
   */
  it('should never fallback when content length >= 200', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 200, max: 10000 }), // Content length >= 200
        fc.boolean(), // JS rendering needed (should not matter)
        fc.webUrl(), // URL
        async (contentLength, jsRenderingNeeded, url) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const markdown = 'A'.repeat(contentLength);
          mockHtmlStrategy.parse.mockResolvedValue(markdown);
          mockJsDetector.needsJsRendering.mockReturnValue(jsRenderingNeeded);

          await contentParser.parse('<html></html>', sourceType, metadata);

          // Should never call Firecrawl when content is sufficient
          expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
          // Should never check JS rendering when content is sufficient
          expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: Minimal content with JS rendering
   *
   * For any content with length < 200 and JS rendering needed,
   * fallback should be triggered for WEB sources.
   *
   * Validates: Requirements 5.3
   */
  it('should always fallback when content < 200 and JS rendering needed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 199 }), // Content length < 200
        fc.webUrl(), // URL
        async (contentLength, url) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const markdown = 'A'.repeat(contentLength);
          mockHtmlStrategy.parse.mockResolvedValue(markdown);
          mockJsDetector.needsJsRendering.mockReturnValue(true); // JS needed

          await contentParser.parse('<html></html>', sourceType, metadata);

          // Should call JS detector
          expect(mockJsDetector.needsJsRendering).toHaveBeenCalled();
          // Should call Firecrawl
          expect(mockFirecrawlStrategy.parse).toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: Minimal content without JS rendering
   *
   * For any content with length < 200 but JS rendering not needed,
   * fallback should NOT be triggered.
   *
   * Validates: Requirements 5.3
   */
  it('should not fallback when content < 200 but JS rendering not needed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 199 }), // Content length < 200
        fc.webUrl(), // URL
        async (contentLength, url) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const markdown = 'A'.repeat(contentLength);
          mockHtmlStrategy.parse.mockResolvedValue(markdown);
          mockJsDetector.needsJsRendering.mockReturnValue(false); // JS not needed

          await contentParser.parse('<html></html>', sourceType, metadata);

          // Should call JS detector
          expect(mockJsDetector.needsJsRendering).toHaveBeenCalled();
          // Should NOT call Firecrawl
          expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Non-WEB source types never fallback
   *
   * For any non-WEB source type, fallback should never be triggered
   * regardless of content length or JS rendering detection.
   *
   * Validates: Requirements 5.3
   */
  it('should never fallback for non-WEB source types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 199 }), // Minimal content
        fc.boolean(), // JS rendering needed (should not matter)
        async (contentLength, jsRenderingNeeded) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          // Test with RSS source type
          const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: 'https://example.com/feed',
          });

          const markdown = 'A'.repeat(contentLength);
          mockRssStrategy.parse.mockResolvedValue(markdown);
          mockJsDetector.needsJsRendering.mockReturnValue(jsRenderingNeeded);

          await contentParser.parse('<rss></rss>', sourceType, metadata);

          // Should never check JS rendering for non-WEB sources
          expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
          // Should never call Firecrawl for non-WEB sources
          expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Fallback graceful degradation
   *
   * For any fallback scenario, if Firecrawl fails, the original
   * markdown should be returned (no exception thrown).
   *
   * Validates: Requirements 5.3
   */
  it('should return original markdown when fallback fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 199 }), // Minimal content
        fc.webUrl(), // URL
        async (contentLength, url) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const originalMarkdown = 'A'.repeat(contentLength);
          mockHtmlStrategy.parse.mockResolvedValue(originalMarkdown);
          mockJsDetector.needsJsRendering.mockReturnValue(true);
          mockFirecrawlStrategy.parse.mockRejectedValue(
            new Error('Firecrawl error'),
          );

          const result = await contentParser.parse(
            '<html></html>',
            sourceType,
            metadata,
          );

          // Should return original markdown on fallback failure
          expect(result.markdown).toBe(originalMarkdown);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: Boundary condition at 200 characters
   *
   * Content with exactly 200 characters should NOT trigger fallback.
   *
   * Validates: Requirements 5.3
   */
  it('should not fallback at exactly 200 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // JS rendering needed (should not matter)
        fc.webUrl(), // URL
        async (jsRenderingNeeded, url) => {
          const contentParser = new ContentParser(
            mockHtmlStrategy,
            mockRssStrategy,
            mockFirecrawlStrategy,
            mockJsDetector,
          );

          const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
          const metadata = ContentMetadata.create({
            title: 'Test',
            sourceUrl: url,
          });

          const markdown = 'A'.repeat(200); // Exactly 200 chars
          mockHtmlStrategy.parse.mockResolvedValue(markdown);
          mockJsDetector.needsJsRendering.mockReturnValue(jsRenderingNeeded);

          await contentParser.parse('<html></html>', sourceType, metadata);

          // Should NOT trigger fallback at boundary
          expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
          expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8: Boundary condition at 199 characters
   *
   * Content with exactly 199 characters should trigger fallback
   * if JS rendering is needed.
   *
   * Validates: Requirements 5.3
   */
  it('should fallback at exactly 199 characters when JS needed', async () => {
    await fc.assert(
      fc.asyncProperty(fc.webUrl(), async (url) => {
        const contentParser = new ContentParser(
          mockHtmlStrategy,
          mockRssStrategy,
          mockFirecrawlStrategy,
          mockJsDetector,
        );

        const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
        const metadata = ContentMetadata.create({
          title: 'Test',
          sourceUrl: url,
        });

        const markdown = 'A'.repeat(199); // Exactly 199 chars
        mockHtmlStrategy.parse.mockResolvedValue(markdown);
        mockJsDetector.needsJsRendering.mockReturnValue(true);

        await contentParser.parse('<html></html>', sourceType, metadata);

        // Should trigger fallback at boundary
        expect(mockJsDetector.needsJsRendering).toHaveBeenCalled();
        expect(mockFirecrawlStrategy.parse).toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
