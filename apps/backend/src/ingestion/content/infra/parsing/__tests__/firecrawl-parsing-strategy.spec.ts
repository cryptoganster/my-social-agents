import { FirecrawlParsingStrategy } from '../firecrawl-parsing-strategy';
import {
  IFirecrawlClient,
  ScrapeResult,
} from '@/ingestion/content/domain/interfaces/external/firecrawl-client';

describe('FirecrawlParsingStrategy', () => {
  let strategy: FirecrawlParsingStrategy;
  let mockFirecrawlClient: jest.Mocked<IFirecrawlClient>;

  beforeEach(() => {
    // Create mock Firecrawl client
    mockFirecrawlClient = {
      scrape: jest.fn(),
      isAvailable: jest.fn(),
    };

    strategy = new FirecrawlParsingStrategy(mockFirecrawlClient);
  });

  describe('parse', () => {
    describe('successful parsing', () => {
      it('should parse URL and return markdown content', async () => {
        const url = 'https://example.com/article';
        const expectedMarkdown = '# Article Title\n\nArticle content here.';

        const scrapeResult: ScrapeResult = {
          markdown: expectedMarkdown,
          metadata: {
            title: 'Article Title',
            description: 'Article description',
          },
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const markdown = await strategy.parse(url);

        expect(markdown).toBe(expectedMarkdown);
        expect(mockFirecrawlClient.scrape).toHaveBeenCalledWith(url, {
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 1000,
          timeout: 30000,
        });
      });

      it('should extract URL from options metadata', async () => {
        const url = 'https://example.com/page';
        const expectedMarkdown = '# Page Content';

        const scrapeResult: ScrapeResult = {
          markdown: expectedMarkdown,
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const markdown = await strategy.parse('', {
          metadata: { url },
        } as any);

        expect(markdown).toBe(expectedMarkdown);
        expect(mockFirecrawlClient.scrape).toHaveBeenCalledWith(
          url,
          expect.any(Object),
        );
      });

      it('should prefer rawContent URL over metadata URL', async () => {
        const rawContentUrl = 'https://example.com/raw';
        const metadataUrl = 'https://example.com/metadata';
        const expectedMarkdown = '# Content';

        const scrapeResult: ScrapeResult = {
          markdown: expectedMarkdown,
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        await strategy.parse(rawContentUrl, {
          metadata: { url: metadataUrl },
        } as any);

        expect(mockFirecrawlClient.scrape).toHaveBeenCalledWith(
          rawContentUrl,
          expect.any(Object),
        );
      });
    });

    describe('error handling', () => {
      it('should return empty string when no URL is provided', async () => {
        const markdown = await strategy.parse('');

        expect(markdown).toBe('');
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });

      it('should return empty string when URL is invalid', async () => {
        const markdown = await strategy.parse('not-a-url');

        expect(markdown).toBe('');
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });

      it('should return empty string when Firecrawl returns no markdown', async () => {
        const url = 'https://example.com/empty';

        const scrapeResult: ScrapeResult = {
          markdown: undefined,
          metadata: {},
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const markdown = await strategy.parse(url);

        expect(markdown).toBe('');
      });

      it('should handle Firecrawl client errors gracefully', async () => {
        const url = 'https://example.com/error';

        mockFirecrawlClient.scrape.mockRejectedValue(
          new Error('Firecrawl service unavailable'),
        );

        const markdown = await strategy.parse(url);

        expect(markdown).toBe('');
      });

      it('should handle network timeout errors gracefully', async () => {
        const url = 'https://example.com/timeout';

        mockFirecrawlClient.scrape.mockRejectedValue(
          new Error('Request timeout'),
        );

        const markdown = await strategy.parse(url);

        expect(markdown).toBe('');
      });

      it('should handle non-Error exceptions gracefully', async () => {
        const url = 'https://example.com/unknown';

        mockFirecrawlClient.scrape.mockRejectedValue('Unknown error');

        const markdown = await strategy.parse(url);

        expect(markdown).toBe('');
      });
    });

    describe('URL validation', () => {
      it('should accept HTTP URLs', async () => {
        const url = 'http://example.com';
        const scrapeResult: ScrapeResult = {
          markdown: '# Content',
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        await strategy.parse(url);

        expect(mockFirecrawlClient.scrape).toHaveBeenCalledWith(
          url,
          expect.any(Object),
        );
      });

      it('should accept HTTPS URLs', async () => {
        const url = 'https://example.com';
        const scrapeResult: ScrapeResult = {
          markdown: '# Content',
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        await strategy.parse(url);

        expect(mockFirecrawlClient.scrape).toHaveBeenCalledWith(
          url,
          expect.any(Object),
        );
      });

      it('should reject non-HTTP protocols', async () => {
        const markdown = await strategy.parse('ftp://example.com');

        expect(markdown).toBe('');
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });

      it('should reject relative URLs', async () => {
        const markdown = await strategy.parse('/relative/path');

        expect(markdown).toBe('');
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });
    });
  });

  describe('extractMetadata', () => {
    describe('successful metadata extraction', () => {
      it('should extract metadata from Firecrawl result', async () => {
        const url = 'https://example.com/article';

        const scrapeResult: ScrapeResult = {
          markdown: '# Article',
          metadata: {
            title: 'Article Title',
            description: 'Article description',
            ogImage: 'https://example.com/image.png',
            sourceURL: 'https://example.com/article',
          },
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const metadata = await strategy.extractMetadata(url);

        expect(metadata.title).toBe('Article Title');
        expect(metadata.description).toBe('Article description');
        expect(metadata.images).toContain('https://example.com/image.png');
        expect(metadata.links).toContain('https://example.com/article');
      });

      it('should handle missing metadata fields', async () => {
        const url = 'https://example.com/minimal';

        const scrapeResult: ScrapeResult = {
          markdown: '# Content',
          metadata: {
            title: 'Title Only',
          },
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const metadata = await strategy.extractMetadata(url);

        expect(metadata.title).toBe('Title Only');
        expect(metadata.description).toBeUndefined();
        expect(metadata.author).toBeUndefined();
        expect(metadata.publishedAt).toBeUndefined();
        expect(metadata.images).toEqual([]);
        expect(metadata.links).toEqual([]);
      });

      it('should return empty object when Firecrawl returns no metadata', async () => {
        const url = 'https://example.com/no-metadata';

        const scrapeResult: ScrapeResult = {
          markdown: '# Content',
          metadata: undefined,
        };

        mockFirecrawlClient.scrape.mockResolvedValue(scrapeResult);

        const metadata = await strategy.extractMetadata(url);

        expect(metadata).toEqual({});
      });
    });

    describe('error handling', () => {
      it('should return empty object when no URL is provided', async () => {
        const metadata = await strategy.extractMetadata('');

        expect(metadata).toEqual({});
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });

      it('should return empty object when URL is invalid', async () => {
        const metadata = await strategy.extractMetadata('not-a-url');

        expect(metadata).toEqual({});
        expect(mockFirecrawlClient.scrape).not.toHaveBeenCalled();
      });

      it('should handle Firecrawl client errors gracefully', async () => {
        const url = 'https://example.com/error';

        mockFirecrawlClient.scrape.mockRejectedValue(
          new Error('Service error'),
        );

        const metadata = await strategy.extractMetadata(url);

        expect(metadata).toEqual({});
      });

      it('should handle non-Error exceptions gracefully', async () => {
        const url = 'https://example.com/unknown';

        mockFirecrawlClient.scrape.mockRejectedValue('Unknown error');

        const metadata = await strategy.extractMetadata(url);

        expect(metadata).toEqual({});
      });
    });
  });
});
