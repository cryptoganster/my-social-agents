import { ContentParser, UnsupportedSourceTypeError } from '../content-parser';
import { IParsingStrategy } from '../../interfaces/services/parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '../../value-objects/content-metadata';

describe('ContentParser', () => {
  let contentParser: ContentParser;
  let mockHtmlStrategy: jest.Mocked<IParsingStrategy>;
  let mockRssStrategy: jest.Mocked<IParsingStrategy>;

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

    contentParser = new ContentParser(mockHtmlStrategy, mockRssStrategy);
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
});
