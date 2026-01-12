import { ContentParser, UnsupportedSourceTypeError } from '../content-parser';
import { IParsingStrategy } from '../../interfaces/services/parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '../../value-objects/content-metadata';
import { IJsRenderingDetector } from '../../interfaces/services/js-rendering-detector';

describe('ContentParser', () => {
  let contentParser: ContentParser;
  let mockHtmlStrategy: jest.Mocked<IParsingStrategy>;
  let mockRssStrategy: jest.Mocked<IParsingStrategy>;
  let mockFirecrawlStrategy: jest.Mocked<IParsingStrategy>;
  let mockJsDetector: jest.Mocked<IJsRenderingDetector>;

  beforeEach(() => {
    mockHtmlStrategy = {
      parse: jest.fn().mockResolvedValue('# Parsed HTML'),
      extractMetadata: jest.fn().mockResolvedValue({
        title: 'Extracted Title',
        author: 'Extracted Author',
      }),
    };

    mockRssStrategy = {
      parse: jest.fn().mockResolvedValue('# Parsed RSS'),
      extractMetadata: jest.fn().mockResolvedValue({
        title: 'RSS Title',
        author: 'RSS Author',
      }),
    };

    mockFirecrawlStrategy = {
      parse: jest.fn().mockResolvedValue('# Firecrawl Parsed Content'),
      extractMetadata: jest.fn().mockResolvedValue({
        title: 'Firecrawl Title',
        author: 'Firecrawl Author',
      }),
    };

    mockJsDetector = {
      needsJsRendering: jest.fn().mockReturnValue(false),
    };

    contentParser = new ContentParser(
      mockHtmlStrategy,
      mockRssStrategy,
      null,
      null,
    );
  });

  describe('strategy selection', () => {
    it('should select HtmlParsingStrategy for WEB source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      await contentParser.parse('<html></html>', sourceType);

      expect(mockHtmlStrategy.parse).toHaveBeenCalled();
      expect(mockRssStrategy.parse).not.toHaveBeenCalled();
    });

    it('should select RssParsingStrategy for RSS source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      await contentParser.parse('<rss></rss>', sourceType);

      expect(mockRssStrategy.parse).toHaveBeenCalled();
      expect(mockHtmlStrategy.parse).not.toHaveBeenCalled();
    });

    it('should select HtmlParsingStrategy for SOCIAL_MEDIA source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA);

      await contentParser.parse('<html></html>', sourceType);

      expect(mockHtmlStrategy.parse).toHaveBeenCalled();
    });

    it('should select HtmlParsingStrategy for WIKIPEDIA source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA);

      await contentParser.parse('<html></html>', sourceType);

      expect(mockHtmlStrategy.parse).toHaveBeenCalled();
    });

    it('should throw UnsupportedSourceTypeError for PDF source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.PDF);

      await expect(contentParser.parse('content', sourceType)).rejects.toThrow(
        UnsupportedSourceTypeError,
      );
    });

    it('should throw UnsupportedSourceTypeError with descriptive message', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.OCR);

      await expect(contentParser.parse('content', sourceType)).rejects.toThrow(
        /No parsing strategy registered for source type/,
      );
    });
  });

  describe('parsing result', () => {
    it('should return parsed markdown content', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.parse.mockResolvedValue('# Parsed Content');

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.markdown).toBe('# Parsed Content');
    });

    it('should return extracted metadata', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'Test Title',
        author: 'Test Author',
        publishedAt: new Date('2024-01-15'),
      });

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.extractedMetadata.title).toBe('Test Title');
      expect(result.extractedMetadata.author).toBe('Test Author');
      expect(result.extractedMetadata.publishedAt).toEqual(
        new Date('2024-01-15'),
      );
    });

    it('should include parsing time in result', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.conversionTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.parsingInfo.conversionTimeMs).toBe('number');
    });

    it('should include parser name in result', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.parser).toBeDefined();
    });

    it('should include original format in result', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.originalFormat).toBe('text/html');
    });

    it('should return application/rss+xml format for RSS', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      const result = await contentParser.parse('<rss></rss>', sourceType);

      expect(result.parsingInfo.originalFormat).toBe('application/rss+xml');
    });
  });

  describe('metadata merging', () => {
    it('should merge extracted metadata with provided metadata', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'Extracted Title',
        // No author extracted
      });

      const providedMetadata = ContentMetadata.create({
        title: 'Provided Title',
        author: 'Provided Author',
        sourceUrl: 'https://example.com',
      });

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        providedMetadata,
      );

      // Extracted title takes precedence
      expect(result.extractedMetadata.title).toBe('Extracted Title');
      // Provided author fills the gap
      expect(result.extractedMetadata.author).toBe('Provided Author');
    });

    it('should use extracted metadata when no provided metadata', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'Extracted Title',
        author: 'Extracted Author',
      });

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.extractedMetadata.title).toBe('Extracted Title');
      expect(result.extractedMetadata.author).toBe('Extracted Author');
    });

    it('should prefer extracted values over provided values', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'Extracted Title',
        author: 'Extracted Author',
      });

      const providedMetadata = ContentMetadata.create({
        title: 'Provided Title',
        author: 'Provided Author',
        sourceUrl: 'https://example.com',
      });

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        providedMetadata,
      );

      expect(result.extractedMetadata.title).toBe('Extracted Title');
      expect(result.extractedMetadata.author).toBe('Extracted Author');
    });
  });

  describe('warning collection', () => {
    it('should collect warning for empty markdown content', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.parse.mockResolvedValue('');

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.warnings).toContain(
        'Parsing produced empty markdown content',
      );
    });

    it('should collect warning for missing title', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        // No title
        author: 'Author',
      });

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.warnings).toContain(
        'Could not extract title from content',
      );
    });

    it('should not include warnings when content and title are present', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      mockHtmlStrategy.parse.mockResolvedValue('# Valid Content');
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'Valid Title',
      });

      const result = await contentParser.parse('<html></html>', sourceType);

      expect(result.parsingInfo.warnings).toBeUndefined();
    });
  });

  describe('strategy selection consistency', () => {
    it('should always select the same strategy for the same source type', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      // Call multiple times
      await contentParser.parse('content1', sourceType);
      await contentParser.parse('content2', sourceType);
      await contentParser.parse('content3', sourceType);

      // Should always use HTML strategy
      expect(mockHtmlStrategy.parse).toHaveBeenCalledTimes(3);
      expect(mockRssStrategy.parse).not.toHaveBeenCalled();
    });
  });

  describe('Firecrawl fallback', () => {
    beforeEach(() => {
      // Create parser with Firecrawl dependencies
      contentParser = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        mockFirecrawlStrategy,
        mockJsDetector,
      );
    });

    it('should trigger fallback when content is minimal and JS rendering is needed', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      // Primary parsing yields minimal content
      mockHtmlStrategy.parse.mockResolvedValue('Short');
      mockJsDetector.needsJsRendering.mockReturnValue(true);

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockJsDetector.needsJsRendering).toHaveBeenCalledWith(
        '<html></html>',
        'https://tradingview.com/chart',
      );
      expect(mockFirecrawlStrategy.parse).toHaveBeenCalled();
      expect(result.markdown).toBe('# Firecrawl Parsed Content');
    });

    it('should not trigger fallback when content is sufficient', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://example.com',
      });

      // Primary parsing yields sufficient content (>= 200 chars)
      mockHtmlStrategy.parse.mockResolvedValue('A'.repeat(200));

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
      expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
      expect(result.markdown).toBe('A'.repeat(200));
    });

    it('should not trigger fallback for non-WEB source types', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://example.com/feed',
      });

      // Primary parsing yields minimal content
      mockRssStrategy.parse.mockResolvedValue('Short');
      mockJsDetector.needsJsRendering.mockReturnValue(true);

      const result = await contentParser.parse(
        '<rss></rss>',
        sourceType,
        metadata,
      );

      expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
      expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
      expect(result.markdown).toBe('Short');
    });

    it('should not trigger fallback when JS rendering is not needed', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://example.com',
      });

      // Primary parsing yields minimal content but JS not needed
      mockHtmlStrategy.parse.mockResolvedValue('Short');
      mockJsDetector.needsJsRendering.mockReturnValue(false);

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockJsDetector.needsJsRendering).toHaveBeenCalled();
      expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
      expect(result.markdown).toBe('Short');
    });

    it('should handle Firecrawl fallback failure gracefully', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      // Primary parsing yields minimal content
      mockHtmlStrategy.parse.mockResolvedValue('Short');
      mockJsDetector.needsJsRendering.mockReturnValue(true);
      mockFirecrawlStrategy.parse.mockRejectedValue(
        new Error('Firecrawl failed'),
      );

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockFirecrawlStrategy.parse).toHaveBeenCalled();
      // Should return original markdown on fallback failure
      expect(result.markdown).toBe('Short');
    });

    it('should use Firecrawl metadata when fallback succeeds', async () => {
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      mockHtmlStrategy.parse.mockResolvedValue('Short');
      mockHtmlStrategy.extractMetadata.mockResolvedValue({
        title: 'HTML Title',
      });
      mockJsDetector.needsJsRendering.mockReturnValue(true);
      mockFirecrawlStrategy.extractMetadata.mockResolvedValue({
        title: 'Firecrawl Title',
        author: 'Firecrawl Author',
      });

      const result = await contentParser.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(result.extractedMetadata.title).toBe('Firecrawl Title');
      expect(result.extractedMetadata.author).toBe('Firecrawl Author');
    });
  });

  describe('Firecrawl fallback disabled', () => {
    it('should work normally when Firecrawl dependencies are not provided', async () => {
      // Parser without Firecrawl dependencies
      const parserWithoutFirecrawl = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        null,
        null,
      );

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      mockHtmlStrategy.parse.mockResolvedValue('Short');

      const result = await parserWithoutFirecrawl.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      // Should not attempt fallback
      expect(result.markdown).toBe('Short');
    });

    it('should not trigger fallback when only Firecrawl strategy is missing', async () => {
      const parserWithoutFirecrawl = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        null,
        mockJsDetector,
      );

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      mockHtmlStrategy.parse.mockResolvedValue('Short');

      const result = await parserWithoutFirecrawl.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockJsDetector.needsJsRendering).not.toHaveBeenCalled();
      expect(result.markdown).toBe('Short');
    });

    it('should not trigger fallback when only JS detector is missing', async () => {
      const parserWithoutDetector = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        mockFirecrawlStrategy,
        null,
      );

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        title: 'Test',
        sourceUrl: 'https://tradingview.com/chart',
      });

      mockHtmlStrategy.parse.mockResolvedValue('Short');

      const result = await parserWithoutDetector.parse(
        '<html></html>',
        sourceType,
        metadata,
      );

      expect(mockFirecrawlStrategy.parse).not.toHaveBeenCalled();
      expect(result.markdown).toBe('Short');
    });
  });
});
