import { Test, TestingModule } from '@nestjs/testing';
import { ContentParser } from '@/ingestion/content/domain/services/content-parser';
import { HtmlParsingStrategy } from '@/ingestion/content/infra/parsing/html-parsing-strategy';
import { RssParsingStrategy } from '@/ingestion/content/infra/parsing/rss-parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';

/**
 * Integration tests for the content parsing pipeline.
 *
 * Tests the complete flow from raw content to parsed markdown,
 * including strategy selection, metadata extraction, and error handling.
 *
 * Requirements: 10.5
 */
describe('Parsing Pipeline Integration', () => {
  let contentParser: ContentParser;
  let htmlStrategy: HtmlParsingStrategy;
  let rssStrategy: RssParsingStrategy;

  beforeEach(async () => {
    htmlStrategy = new HtmlParsingStrategy();
    rssStrategy = new RssParsingStrategy(htmlStrategy);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'IHtmlParsingStrategy',
          useValue: htmlStrategy,
        },
        {
          provide: 'IRssParsingStrategy',
          useValue: rssStrategy,
        },
        ContentParser,
      ],
    }).compile();

    contentParser = module.get<ContentParser>(ContentParser);
  });

  describe('HTML to Markdown Pipeline', () => {
    it('should convert complete HTML document to markdown', async () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bitcoin Analysis</title>
          <meta name="author" content="Crypto Expert">
          <meta property="article:published_time" content="2024-01-15T10:00:00Z">
        </head>
        <body>
          <h1>Bitcoin Price Analysis</h1>
          <p>Bitcoin has shown strong momentum in recent weeks.</p>
          <h2>Technical Indicators</h2>
          <ul>
            <li>RSI: 65</li>
            <li>MACD: Bullish crossover</li>
          </ul>
          <p>Read more at <a href="https://example.com">our website</a>.</p>
        </body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      // Verify markdown output
      expect(result.markdown).toContain('# Bitcoin Price Analysis');
      expect(result.markdown).toContain('## Technical Indicators');
      expect(result.markdown).toContain('RSI: 65');
      expect(result.markdown).toContain('MACD: Bullish crossover');
      expect(result.markdown).toContain('[our website](https://example.com)');

      // Verify metadata extraction
      expect(result.extractedMetadata.title).toBe('Bitcoin Analysis');
      expect(result.extractedMetadata.author).toBe('Crypto Expert');

      // Verify parsing info
      expect(result.parsingInfo.parser).toBe('HtmlParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('text/html');
      expect(result.parsingInfo.conversionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle HTML with code blocks', async () => {
      const html = `
        <h1>Smart Contract Example</h1>
        <pre><code class="language-solidity">
contract Token {
    mapping(address => uint256) balances;
}
        </code></pre>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      expect(result.markdown).toContain('# Smart Contract Example');
      // Code blocks are preserved (turndown wraps pre/code in ```)
      expect(result.markdown).toContain('```');
      expect(result.markdown).toContain('contract Token');
    });

    it('should remove script and style elements', async () => {
      const html = `
        <html>
        <head>
          <style>.hidden { display: none; }</style>
          <script>alert('malicious');</script>
        </head>
        <body>
          <h1>Clean Content</h1>
          <script>console.log('removed');</script>
          <p>This is the actual content.</p>
        </body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      expect(result.markdown).not.toContain('script');
      expect(result.markdown).not.toContain('style');
      expect(result.markdown).not.toContain('malicious');
      expect(result.markdown).not.toContain('removed');
      expect(result.markdown).toContain('Clean Content');
      expect(result.markdown).toContain('This is the actual content');
    });
  });

  describe('RSS to Markdown Pipeline', () => {
    it('should convert RSS feed to markdown', async () => {
      const rss = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Crypto News Feed</title>
            <item>
              <title>Bitcoin Hits New High</title>
              <description>Bitcoin reached $50,000 today.</description>
              <link>https://example.com/btc-high</link>
              <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
              <author>news@example.com</author>
            </item>
            <item>
              <title>Ethereum Update</title>
              <description>Ethereum 2.0 progress continues.</description>
              <link>https://example.com/eth-update</link>
              <pubDate>Mon, 15 Jan 2024 11:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const result = await contentParser.parse(rss, sourceType);

      // Verify markdown structure
      expect(result.markdown).toContain('# Crypto News Feed');
      expect(result.markdown).toContain('## Bitcoin Hits New High');
      expect(result.markdown).toContain('Bitcoin reached $50,000 today');
      expect(result.markdown).toContain('## Ethereum Update');
      expect(result.markdown).toContain('Ethereum 2.0 progress continues');

      // Verify metadata from first item
      expect(result.extractedMetadata.title).toBe('Bitcoin Hits New High');

      // Verify parsing info
      expect(result.parsingInfo.parser).toBe('RssParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('application/rss+xml');
    });

    it('should handle RSS with content:encoded', async () => {
      const rss = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel>
            <title>Tech Blog</title>
            <item>
              <title>DeFi Explained</title>
              <content:encoded><![CDATA[
                <h2>What is DeFi?</h2>
                <p>Decentralized Finance is revolutionizing banking.</p>
                <ul>
                  <li>Lending protocols</li>
                  <li>DEX platforms</li>
                </ul>
              ]]></content:encoded>
              <link>https://example.com/defi</link>
            </item>
          </channel>
        </rss>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);
      const result = await contentParser.parse(rss, sourceType);

      // content:encoded should be converted to markdown
      expect(result.markdown).toContain('What is DeFi?');
      expect(result.markdown).toContain('Decentralized Finance');
      expect(result.markdown).toContain('Lending protocols');
      expect(result.markdown).toContain('DEX platforms');
    });
  });

  describe('Metadata Merging', () => {
    it('should merge extracted metadata with provided metadata', async () => {
      const html = `
        <html>
        <head>
          <title>Extracted Title</title>
        </head>
        <body>
          <p>Content here</p>
        </body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const providedMetadata = ContentMetadata.create({
        author: 'Provided Author',
        publishedAt: new Date('2024-01-15'),
        sourceUrl: 'https://example.com/article',
      });

      const result = await contentParser.parse(
        html,
        sourceType,
        providedMetadata,
      );

      // Extracted title should be used
      expect(result.extractedMetadata.title).toBe('Extracted Title');
      // Provided author should be used (not extracted)
      expect(result.extractedMetadata.author).toBe('Provided Author');
      // Provided publishedAt should be used
      expect(result.extractedMetadata.publishedAt).toEqual(
        new Date('2024-01-15'),
      );
    });

    it('should prefer extracted metadata over provided when both exist', async () => {
      const html = `
        <html>
        <head>
          <title>Extracted Title</title>
          <meta name="author" content="Extracted Author">
        </head>
        <body><p>Content</p></body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const providedMetadata = ContentMetadata.create({
        title: 'Provided Title',
        author: 'Provided Author',
      });

      const result = await contentParser.parse(
        html,
        sourceType,
        providedMetadata,
      );

      // Extracted values should take precedence
      expect(result.extractedMetadata.title).toBe('Extracted Title');
      expect(result.extractedMetadata.author).toBe('Extracted Author');
    });
  });

  describe('Error Handling and Warnings', () => {
    it('should add warning for empty content', async () => {
      const html = '<html><body></body></html>';

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.warnings).toBeDefined();
      expect(result.parsingInfo.warnings).toContain(
        'Parsing produced empty markdown content',
      );
    });

    it('should add warning for missing title', async () => {
      const html = '<html><body><p>Content without title</p></body></html>';

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.warnings).toBeDefined();
      expect(result.parsingInfo.warnings).toContain(
        'Could not extract title from content',
      );
    });

    it('should handle malformed HTML gracefully', async () => {
      const malformedHtml = '<div><p>Unclosed tags<span>nested';

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      // Should not throw
      const result = await contentParser.parse(malformedHtml, sourceType);

      expect(result.markdown).toBeDefined();
      expect(result.parsingInfo.parser).toBe('HtmlParsingStrategy');
    });

    it('should throw for unsupported source type', async () => {
      const content = 'Some content';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.PDF);

      await expect(contentParser.parse(content, sourceType)).rejects.toThrow(
        'No parsing strategy registered for source type: PDF',
      );
    });
  });

  describe('Strategy Selection', () => {
    it('should use HtmlParsingStrategy for WEB source type', async () => {
      const html = '<h1>Web Content</h1>';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.parser).toBe('HtmlParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('text/html');
    });

    it('should use RssParsingStrategy for RSS source type', async () => {
      const rss = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item><title>Item</title><description>Desc</description></item>
          </channel>
        </rss>
      `;
      const sourceType = SourceType.fromEnum(SourceTypeEnum.RSS);

      const result = await contentParser.parse(rss, sourceType);

      expect(result.parsingInfo.parser).toBe('RssParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('application/rss+xml');
    });

    it('should use HtmlParsingStrategy for SOCIAL_MEDIA source type', async () => {
      const html = '<p>Social media post content</p>';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.SOCIAL_MEDIA);

      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.parser).toBe('HtmlParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('text/html');
    });

    it('should use HtmlParsingStrategy for WIKIPEDIA source type', async () => {
      const html = '<h1>Wikipedia Article</h1><p>Content</p>';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WIKIPEDIA);

      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.parser).toBe('HtmlParsingStrategy');
      expect(result.parsingInfo.originalFormat).toBe('text/html');
    });
  });

  describe('Performance', () => {
    it('should measure conversion time', async () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await contentParser.parse(html, sourceType);

      expect(result.parsingInfo.conversionTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.parsingInfo.conversionTimeMs).toBe('number');
    });

    it('should handle large HTML documents', async () => {
      // Generate large HTML with many paragraphs
      const paragraphs = Array.from(
        { length: 100 },
        (_, i) =>
          `<p>Paragraph ${i + 1} with some content about cryptocurrency.</p>`,
      ).join('\n');
      const html = `<html><body><h1>Large Document</h1>${paragraphs}</body></html>`;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const result = await contentParser.parse(html, sourceType);

      expect(result.markdown).toContain('# Large Document');
      expect(result.markdown).toContain('Paragraph 1');
      expect(result.markdown).toContain('Paragraph 100');
      // Should complete in reasonable time (< 1 second)
      expect(result.parsingInfo.conversionTimeMs).toBeLessThan(1000);
    });
  });
});
