import * as fc from 'fast-check';
import { HtmlParsingStrategy } from '@/ingestion/content/infra/parsing/html-parsing-strategy';
import { RssParsingStrategy } from '@/ingestion/content/infra/parsing/rss-parsing-strategy';

/**
 * Property-based tests for RSS parsing.
 *
 * Property 5: RSS Feed Item Parsing
 * - All feed items are extracted and converted
 *
 * Validates: Requirements 5.2, 5.3, 5.4
 */
describe('RSS Parsing Properties', () => {
  let htmlStrategy: HtmlParsingStrategy;
  let rssStrategy: RssParsingStrategy;

  beforeEach(() => {
    htmlStrategy = new HtmlParsingStrategy();
    rssStrategy = new RssParsingStrategy(htmlStrategy);
  });

  // Generator for safe XML content (alphanumeric to avoid XML issues)
  const safeStringArb = fc
    .string({ minLength: 3, maxLength: 30 })
    .filter((s: string) => /^[a-zA-Z0-9 ]+$/.test(s) && s.trim().length > 0);

  /**
   * Property: All RSS items should be extracted
   *
   * For any valid RSS feed with N items, the parsed output should
   * contain content from all N items.
   */
  describe('Property: All RSS items are extracted', () => {
    // Generate RSS item
    const rssItemArb = fc.record({
      title: safeStringArb,
      description: safeStringArb,
    });

    it('should extract all items from RSS feed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(rssItemArb, { minLength: 1, maxLength: 10 }),
          async (items) => {
            // Build RSS feed
            const itemsXml = items
              .map(
                (item) => `
              <item>
                <title>${item.title}</title>
                <description>${item.description}</description>
              </item>
            `,
              )
              .join('\n');

            const rss = `
              <?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <title>Test Feed</title>
                  ${itemsXml}
                </channel>
              </rss>
            `;

            const result = await rssStrategy.parse(rss);

            // Each item's title should appear in the output
            for (const item of items) {
              expect(result).toContain(item.title.trim());
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should preserve item order in output', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (itemCount) => {
          // Use unique, predictable titles to avoid indexOf collisions
          const items = Array.from({ length: itemCount }, (_, i) => ({
            title: `UniqueTitle${i + 1}Item`,
            description: `Description for item ${i + 1}`,
          }));

          const itemsXml = items
            .map(
              (item) => `
              <item>
                <title>${item.title}</title>
                <description>${item.description}</description>
              </item>
            `,
            )
            .join('\n');

          const rss = `
              <?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <title>Test Feed</title>
                  ${itemsXml}
                </channel>
              </rss>
            `;

          const result = await rssStrategy.parse(rss);

          // Items should appear in order
          let lastIndex = -1;
          for (const item of items) {
            const currentIndex = result.indexOf(item.title);
            expect(currentIndex).toBeGreaterThan(lastIndex);
            lastIndex = currentIndex;
          }
        }),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property: RSS metadata extraction is consistent
   *
   * For any valid RSS feed, metadata extraction should return
   * consistent results for the same input.
   */
  describe('Property: Metadata extraction consistency', () => {
    it('should extract consistent metadata for same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          safeStringArb,
          safeStringArb,
          async (title, description) => {
            const rss = `
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <title>Feed Title</title>
                <item>
                  <title>${title}</title>
                  <description>${description}</description>
                </item>
              </channel>
            </rss>
          `;

            // Extract metadata twice
            const metadata1 = await rssStrategy.extractMetadata(rss);
            const metadata2 = await rssStrategy.extractMetadata(rss);

            // Should be identical
            expect(metadata1.title).toBe(metadata2.title);
            expect(metadata1.description).toBe(metadata2.description);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property: Empty feeds produce empty output
   *
   * RSS feeds with no items should produce minimal output.
   */
  describe('Property: Empty feeds handling', () => {
    it('should handle feeds with no items', async () => {
      const rss = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
          </channel>
        </rss>
      `;

      const result = await rssStrategy.parse(rss);

      // Should contain feed title but no item content
      expect(result).toContain('Empty Feed');
      // Should not have item separators
      expect(result.split('---').length).toBeLessThanOrEqual(2);
    });
  });

  /**
   * Property: HTML in RSS content is converted to markdown
   *
   * When RSS items contain HTML in description or content:encoded,
   * the HTML should be converted to markdown.
   */
  describe('Property: HTML content conversion', () => {
    const htmlTextArb = fc
      .string({ minLength: 3, maxLength: 20 })
      .filter((s: string) => /^[a-zA-Z ]+$/.test(s) && s.trim().length > 0);

    it('should convert HTML in descriptions to markdown', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('strong', 'em', 'b', 'i'),
          htmlTextArb,
          async (tag, text) => {
            const rss = `
              <?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <title>Feed</title>
                  <item>
                    <title>Item</title>
                    <description><![CDATA[<${tag}>${text}</${tag}>]]></description>
                  </item>
                </channel>
              </rss>
            `;

            const result = await rssStrategy.parse(rss);

            // Text should be present (HTML converted)
            expect(result).toContain(text.trim());
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property: Invalid RSS throws error
   *
   * Completely invalid XML should throw an error.
   */
  describe('Property: Invalid RSS handling', () => {
    it('should throw for completely invalid XML', async () => {
      const invalidInputs = [
        'not xml at all',
        '<html><body>Not RSS</body></html>',
        '{"json": "not rss"}',
      ];

      for (const input of invalidInputs) {
        await expect(rssStrategy.parse(input)).rejects.toThrow();
      }
    });
  });

  /**
   * Property: Feed title appears in output
   *
   * The channel title should always appear in the parsed output.
   */
  describe('Property: Feed title preservation', () => {
    it('should include feed title in output', async () => {
      await fc.assert(
        fc.asyncProperty(safeStringArb, async (feedTitle) => {
          const rss = `
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <title>${feedTitle}</title>
                <item>
                  <title>Item</title>
                  <description>Description</description>
                </item>
              </channel>
            </rss>
          `;

          const result = await rssStrategy.parse(rss);

          // Feed title should be in output (as header)
          expect(result).toContain(feedTitle.trim());
        }),
        { numRuns: 20 },
      );
    });
  });
});
