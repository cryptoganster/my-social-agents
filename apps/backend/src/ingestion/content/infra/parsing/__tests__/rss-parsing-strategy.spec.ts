import { RssParsingStrategy } from '../rss-parsing-strategy';
import { IParsingStrategy } from '@/ingestion/content/domain/interfaces/services/parsing-strategy';

describe('RssParsingStrategy', () => {
  let strategy: RssParsingStrategy;
  let mockHtmlStrategy: jest.Mocked<IParsingStrategy>;

  beforeEach(() => {
    mockHtmlStrategy = {
      parse: jest.fn().mockResolvedValue('Parsed HTML content'),
      extractMetadata: jest.fn().mockResolvedValue({}),
    };
    strategy = new RssParsingStrategy(mockHtmlStrategy);
  });

  const createRss20Feed = (options: {
    title?: string;
    items?: Array<{
      title?: string;
      link?: string;
      description?: string;
      pubDate?: string;
      author?: string;
      contentEncoded?: string;
    }>;
  }) => {
    const items =
      options.items
        ?.map(
          (item) => `
      <item>
        ${item.title ? `<title>${item.title}</title>` : ''}
        ${item.link ? `<link>${item.link}</link>` : ''}
        ${item.description ? `<description>${item.description}</description>` : ''}
        ${item.pubDate ? `<pubDate>${item.pubDate}</pubDate>` : ''}
        ${item.author ? `<dc:creator>${item.author}</dc:creator>` : ''}
        ${item.contentEncoded ? `<content:encoded><![CDATA[${item.contentEncoded}]]></content:encoded>` : ''}
      </item>
    `,
        )
        .join('') || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          ${options.title ? `<title>${options.title}</title>` : ''}
          ${items}
        </channel>
      </rss>`;
  };

  const createAtomFeed = (options: {
    title?: string;
    items?: Array<{
      title?: string;
      link?: string;
      content?: string;
      published?: string;
      author?: string;
    }>;
  }) => {
    const entries =
      options.items
        ?.map(
          (item) => `
      <entry>
        ${item.title ? `<title>${item.title}</title>` : ''}
        ${item.link ? `<link href="${item.link}"/>` : ''}
        ${item.content ? `<content type="html">${item.content}</content>` : ''}
        ${item.published ? `<published>${item.published}</published>` : ''}
        ${item.author ? `<author><name>${item.author}</name></author>` : ''}
      </entry>
    `,
        )
        .join('') || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        ${options.title ? `<title>${options.title}</title>` : ''}
        ${entries}
      </feed>`;
  };

  describe('parse', () => {
    describe('RSS 2.0 feed parsing', () => {
      it('should parse RSS 2.0 feed format', async () => {
        const rss = createRss20Feed({
          title: 'Crypto News',
          items: [
            {
              title: 'Bitcoin Update',
              description: '<p>Bitcoin news content</p>',
            },
          ],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('# Crypto News');
        expect(markdown).toContain('## Bitcoin Update');
      });

      it('should extract feed title as markdown header', async () => {
        const rss = createRss20Feed({
          title: 'My Feed Title',
          items: [],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('# My Feed Title');
      });

      it('should convert item content:encoded to markdown', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            {
              title: 'Article',
              contentEncoded: '<p>Rich HTML content</p>',
            },
          ],
        });

        await strategy.parse(rss);
        expect(mockHtmlStrategy.parse).toHaveBeenCalledWith(
          '<p>Rich HTML content</p>',
          undefined,
        );
      });

      it('should fallback to description when content:encoded is missing', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            {
              title: 'Article',
              description: '<p>Description content</p>',
            },
          ],
        });

        await strategy.parse(rss);
        // rss-parser wraps description in a div
        expect(mockHtmlStrategy.parse).toHaveBeenCalledWith(
          expect.stringContaining('Description content'),
          undefined,
        );
      });

      it('should extract item author from dc:creator', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            {
              title: 'Article',
              author: 'John Doe',
              description: 'Content',
            },
          ],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('**Author:** John Doe');
      });

      it('should extract publication date from pubDate', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            {
              title: 'Article',
              pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
              description: 'Content',
            },
          ],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('**Published:**');
      });

      it('should include item link as "Read more"', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            {
              title: 'Article',
              link: 'https://example.com/article',
              description: 'Content',
            },
          ],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('[Read more](https://example.com/article)');
      });

      it('should separate items with horizontal rules', async () => {
        const rss = createRss20Feed({
          title: 'Feed',
          items: [
            { title: 'Article 1', description: 'Content 1' },
            { title: 'Article 2', description: 'Content 2' },
          ],
        });

        const markdown = await strategy.parse(rss);
        expect(markdown).toContain('---');
      });
    });

    describe('Atom feed parsing', () => {
      it('should parse Atom feed format', async () => {
        const atom = createAtomFeed({
          title: 'Atom Feed',
          items: [
            {
              title: 'Atom Entry',
              content: '<p>Atom content</p>',
            },
          ],
        });

        const markdown = await strategy.parse(atom);
        expect(markdown).toContain('# Atom Feed');
        expect(markdown).toContain('## Atom Entry');
      });

      it('should extract Atom entry link', async () => {
        const atom = createAtomFeed({
          title: 'Feed',
          items: [
            {
              title: 'Entry',
              link: 'https://example.com/entry',
              content: '<p>Content</p>',
            },
          ],
        });

        const markdown = await strategy.parse(atom);
        expect(markdown).toContain('[Read more](https://example.com/entry)');
      });
    });

    describe('error handling', () => {
      it('should throw descriptive error for invalid feed', async () => {
        const invalidXml = '<not-a-feed>Invalid content</not-a-feed>';

        await expect(strategy.parse(invalidXml)).rejects.toThrow(
          /Failed to parse RSS feed/,
        );
      });

      it('should return empty string for empty content', async () => {
        const markdown = await strategy.parse('');
        expect(markdown).toBe('');
      });

      it('should return empty string for whitespace-only content', async () => {
        const markdown = await strategy.parse('   \n\t  ');
        expect(markdown).toBe('');
      });
    });
  });

  describe('extractMetadata', () => {
    it('should extract title from first item', async () => {
      const rss = createRss20Feed({
        title: 'Feed Title',
        items: [
          { title: 'First Article', description: 'Content' },
          { title: 'Second Article', description: 'Content' },
        ],
      });

      const metadata = await strategy.extractMetadata(rss);
      expect(metadata.title).toBe('First Article');
    });

    it('should fallback to feed title when no items', async () => {
      const rss = createRss20Feed({
        title: 'Feed Title',
        items: [],
      });

      const metadata = await strategy.extractMetadata(rss);
      expect(metadata.title).toBe('Feed Title');
    });

    it('should extract author from dc:creator', async () => {
      const rss = createRss20Feed({
        title: 'Feed',
        items: [
          {
            title: 'Article',
            author: 'Jane Smith',
            description: 'Content',
          },
        ],
      });

      const metadata = await strategy.extractMetadata(rss);
      expect(metadata.author).toBe('Jane Smith');
    });

    it('should extract published date from pubDate', async () => {
      const rss = createRss20Feed({
        title: 'Feed',
        items: [
          {
            title: 'Article',
            pubDate: 'Mon, 15 Jan 2024 10:30:00 GMT',
            description: 'Content',
          },
        ],
      });

      const metadata = await strategy.extractMetadata(rss);
      expect(metadata.publishedAt).toBeInstanceOf(Date);
    });

    it('should extract links from feed and items', async () => {
      const rss = `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <link>https://feed.example.com</link>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
            </item>
          </channel>
        </rss>`;

      const metadata = await strategy.extractMetadata(rss);
      expect(metadata.links).toContain('https://feed.example.com');
      expect(metadata.links).toContain('https://example.com/article');
    });

    it('should return empty object for empty content', async () => {
      const metadata = await strategy.extractMetadata('');
      expect(metadata).toEqual({});
    });

    it('should handle invalid feed gracefully', async () => {
      const metadata = await strategy.extractMetadata('<invalid>');
      expect(metadata).toEqual({});
    });
  });
});
