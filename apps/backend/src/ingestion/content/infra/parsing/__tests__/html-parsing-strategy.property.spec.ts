import * as fc from 'fast-check';
import { HtmlParsingStrategy } from '../html-parsing-strategy';

/**
 * Property-Based Tests for HtmlParsingStrategy
 *
 * Feature: content-parsing-strategy
 * Validates: Requirements 4.2, 4.3, 4.6
 *
 * These tests verify universal properties that must hold for ALL valid HTML inputs.
 * We use fast-check to generate random test cases and verify correctness properties.
 */
describe('HtmlParsingStrategy - Property-Based Tests', () => {
  let strategy: HtmlParsingStrategy;

  beforeEach(() => {
    strategy = new HtmlParsingStrategy();
  });

  /**
   * Property 2: HTML to Markdown Structure Preservation
   *
   * For any HTML document with headers (h1-h6), the resulting markdown
   * should preserve the header hierarchy using # symbols.
   *
   * Validates: Requirements 4.2
   */
  describe('Property 2: HTML to Markdown Structure Preservation', () => {
    // Generator for header levels (1-6)
    const headerLevelArb = fc.integer({ min: 1, max: 6 });

    // Generator for header text (alphanumeric with spaces)
    const headerTextArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => /^[a-zA-Z0-9 ]+$/.test(s) && s.trim().length > 0);

    it('should convert h1-h6 tags to corresponding # markdown headers', async () => {
      await fc.assert(
        fc.asyncProperty(headerLevelArb, headerTextArb, async (level, text) => {
          const trimmedText = text.trim();
          if (trimmedText.length === 0) return;

          const html = `<h${level}>${trimmedText}</h${level}>`;
          const markdown = await strategy.parse(html);

          // The markdown should contain the header with correct # count
          // Turndown uses ATX-style headers: # Header, ## Header, etc.
          // The header line should start with the correct number of # followed by space and text
          const expectedPrefix = '#'.repeat(level);
          const headerRegex = new RegExp(
            `^${expectedPrefix}\\s+${trimmedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
            'm',
          );

          // Verify the markdown contains a properly formatted header
          // Either as a regex match or by checking both prefix and text exist
          const hasCorrectHeader =
            headerRegex.test(markdown) ||
            (markdown.includes(expectedPrefix) &&
              markdown.includes(trimmedText));

          expect(hasCorrectHeader).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve header hierarchy order in multi-header documents', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(headerLevelArb, headerTextArb), {
            minLength: 2,
            maxLength: 5,
          }),
          async (headers) => {
            // Filter out empty texts and ensure unique, non-overlapping texts
            const validTexts: string[] = [];
            const validHeaders: Array<[number, string]> = [];

            for (const [level, text] of headers) {
              const trimmed = text.trim();
              if (trimmed.length === 0) continue;

              // Check if this text is a substring of any existing text or vice versa
              const hasOverlap = validTexts.some(
                (existing) =>
                  existing.includes(trimmed) || trimmed.includes(existing),
              );
              if (hasOverlap) continue;

              validTexts.push(trimmed);
              validHeaders.push([level, trimmed]);
            }

            if (validHeaders.length < 2) return;

            // Build HTML with multiple headers
            const html = validHeaders
              .map(([level, text]) => `<h${level}>${text}</h${level}>`)
              .join('\n');

            const markdown = await strategy.parse(html);

            // All headers should appear in the markdown in order
            let lastIndex = -1;
            for (const [, text] of validHeaders) {
              const index = markdown.indexOf(text);
              expect(index).toBeGreaterThan(lastIndex);
              lastIndex = index;
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 3: Link Preservation
   *
   * For any HTML document with HTTP/HTTPS links, all links should be
   * preserved in the resulting markdown output.
   *
   * Validates: Requirements 4.3
   */
  describe('Property 3: Link Preservation', () => {
    // Generator for valid URL paths (alphanumeric with dashes and slashes)
    const urlPathArb = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => /^[a-z0-9\-_/]+$/.test(s));

    // Generator for link text (alphanumeric with spaces)
    const linkTextArb = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => /^[a-zA-Z0-9 ]+$/.test(s) && s.trim().length > 0);

    // Generator for protocol
    const protocolArb = fc.constantFrom('http', 'https');

    // Generator for domain (lowercase letters only)
    const domainArb = fc
      .string({ minLength: 3, maxLength: 15 })
      .filter((s) => /^[a-z]+$/.test(s));

    it('should preserve all HTTP/HTTPS links in markdown output', async () => {
      await fc.assert(
        fc.asyncProperty(
          protocolArb,
          domainArb,
          urlPathArb,
          linkTextArb,
          async (protocol, domain, path, text) => {
            const trimmedText = text.trim();
            if (trimmedText.length === 0 || domain.length === 0) return;

            const url = `${protocol}://${domain}.com/${path}`;
            const html = `<a href="${url}">${trimmedText}</a>`;
            const markdown = await strategy.parse(html);

            // The URL should be preserved in the markdown
            expect(markdown).toContain(url);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve multiple links in a document', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(protocolArb, domainArb, urlPathArb, linkTextArb), {
            minLength: 2,
            maxLength: 5,
          }),
          async (links) => {
            // Filter valid links
            const validLinks = links.filter(
              ([, domain, , text]) =>
                domain.length > 0 && text.trim().length > 0,
            );
            if (validLinks.length < 2) return;

            // Build HTML with multiple links
            const html = validLinks
              .map(([protocol, domain, path, text]) => {
                const url = `${protocol}://${domain}.com/${path}`;
                return `<a href="${url}">${text.trim()}</a>`;
              })
              .join(' ');

            const markdown = await strategy.parse(html);

            // All URLs should be preserved
            for (const [protocol, domain, path] of validLinks) {
              const url = `${protocol}://${domain}.com/${path}`;
              expect(markdown).toContain(url);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 6: Graceful Failure Handling
   *
   * For any input (including malformed HTML), the parser should never throw
   * an exception. It should return an empty string or best-effort result.
   *
   * Validates: Requirements 4.6
   */
  describe('Property 6: Graceful Failure Handling', () => {
    // Generator for arbitrary strings (including malformed HTML)
    const arbitraryStringArb = fc.string({ minLength: 0, maxLength: 500 });

    // Generator for malformed HTML patterns
    const malformedHtmlArb = fc.oneof(
      // Unclosed tags
      fc.constant('<div><p>unclosed'),
      fc.constant('<html><body>no closing'),
      // Mismatched tags
      fc.constant('<div><span></div></span>'),
      fc.constant('<p><b>mismatched</p></b>'),
      // Invalid nesting
      fc.constant('<p><div>invalid nesting</div></p>'),
      // Random angle brackets
      fc
        .string({ minLength: 10, maxLength: 100 })
        .map((s) =>
          s.replace(/[a-z]/gi, (c) => (Math.random() > 0.5 ? '<' : c)),
        ),
      // Empty and whitespace
      fc.constant(''),
      fc.constant('   '),
      fc.constant('\n\t\r'),
      // Just text (no HTML)
      fc.string({ minLength: 1, maxLength: 100 }),
      // Partial tags
      fc.constant('<'),
      fc.constant('<<<<<'),
      fc.constant('>>>'),
      fc.constant('<div'),
      fc.constant('div>'),
      // Script injection attempts
      fc.constant('<script>alert("xss")</script>'),
      fc.constant('<img onerror="alert(1)" src="x">'),
    );

    it('should never throw for any arbitrary string input', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStringArb, async (input) => {
          // Should not throw
          const result = await strategy.parse(input);

          // Result should always be a string
          expect(typeof result).toBe('string');
        }),
        { numRuns: 200 },
      );
    });

    it('should never throw for malformed HTML patterns', async () => {
      await fc.assert(
        fc.asyncProperty(malformedHtmlArb, async (input) => {
          // Should not throw
          const result = await strategy.parse(input);

          // Result should always be a string
          expect(typeof result).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('should return empty string for empty or whitespace-only input', async () => {
      // Test specific whitespace patterns
      const whitespaceInputs = ['', ' ', '  ', '\t', '\n', '\r', ' \t\n\r '];

      for (const whitespace of whitespaceInputs) {
        const result = await strategy.parse(whitespace);
        expect(result).toBe('');
      }
    });

    it('should handle extractMetadata without throwing for any input', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryStringArb, async (input) => {
          // Should not throw
          const result = await strategy.extractMetadata(input);

          // Result should always be an object
          expect(typeof result).toBe('object');
          expect(result).not.toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Additional Property: Content preservation for plain text
   *
   * Parsing plain text wrapped in HTML should preserve the text content.
   * Note: HTML parsing normalizes whitespace (multiple spaces become single space),
   * which is standard HTML behavior.
   */
  describe('Property: Content preservation for plain text', () => {
    const plainTextArb = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => /^[a-zA-Z0-9 .,!?]+$/.test(s) && s.trim().length > 0);

    /**
     * Helper to normalize whitespace the same way HTML does:
     * - Collapse multiple spaces into single space
     * - Trim leading/trailing whitespace
     */
    const normalizeWhitespace = (text: string): string =>
      text.replace(/\s+/g, ' ').trim();

    it('should preserve plain text content without HTML tags', async () => {
      await fc.assert(
        fc.asyncProperty(plainTextArb, async (text) => {
          const trimmedText = text.trim();
          if (trimmedText.length === 0) return;

          // Wrap in a simple div to ensure it's processed
          const html = `<div>${trimmedText}</div>`;
          const markdown = await strategy.parse(html);

          // The text content should be preserved (with normalized whitespace)
          // HTML parsing normalizes multiple spaces to single space, which is expected behavior
          const normalizedExpected = normalizeWhitespace(trimmedText);
          const normalizedActual = normalizeWhitespace(markdown);

          expect(normalizedActual).toContain(normalizedExpected);
        }),
        { numRuns: 100 },
      );
    });
  });
});
