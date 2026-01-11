import * as fc from 'fast-check';
import { JsRenderingDetector } from '../js-rendering-detector';

/**
 * Property-Based Tests for JsRenderingDetector
 *
 * Feature: firecrawl-integration
 * Property 1: Detection Consistency
 * Property 2: Known Domain Detection
 * Property 3: SPA Marker Detection with Content Length
 * Validates: Requirements 5.2, 5.4
 *
 * These tests verify that JS rendering detection is deterministic and consistent
 * across various inputs.
 */
describe('JsRenderingDetector - Property-Based Tests', () => {
  let detector: JsRenderingDetector;

  beforeEach(() => {
    detector = new JsRenderingDetector();
  });

  /**
   * Property 1: Detection Consistency
   *
   * For any HTML and URL combination, the same result should always be returned.
   * This ensures deterministic behavior across multiple calls.
   *
   * Validates: Requirements 5.4
   */
  describe('Property 1: Detection Consistency', () => {
    it('should return the same result for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 1000 }),
          fc.webUrl(),
          (html, url) => {
            const result1 = detector.needsJsRendering(html, url);
            const result2 = detector.needsJsRendering(html, url);
            const result3 = detector.needsJsRendering(html, url);

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should be stateless - previous calls do not affect current call', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.string({ maxLength: 500 }), fc.webUrl()), {
            minLength: 3,
            maxLength: 10,
          }),
          (inputs) => {
            // Make multiple calls
            inputs.forEach(([html, url]) => {
              detector.needsJsRendering(html, url);
            });

            // Test the last input again - should get same result
            const [lastHtml, lastUrl] = inputs[inputs.length - 1];
            const result1 = detector.needsJsRendering(lastHtml, lastUrl);
            const result2 = detector.needsJsRendering(lastHtml, lastUrl);

            expect(result1).toBe(result2);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 2: Known Domain Detection
   *
   * For any URL containing a known JS-heavy domain, detection should return true
   * regardless of HTML content.
   *
   * Validates: Requirements 5.2
   */
  describe('Property 2: Known Domain Detection', () => {
    const jsHeavyDomains = [
      'tradingview.com',
      'dexscreener.com',
      'coingecko.com',
      'coinmarketcap.com',
    ];

    const jsHeavyDomainArb = fc.constantFrom(...jsHeavyDomains);

    it('should always return true for known JS-heavy domains', () => {
      fc.assert(
        fc.property(
          jsHeavyDomainArb,
          fc.string({ maxLength: 1000 }),
          fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          (domain, html, path, query) => {
            // Build URL with various components
            const pathPart = path ? `/${path}` : '';
            const queryPart = query ? `?${query}` : '';
            const url = `https://${domain}${pathPart}${queryPart}`;

            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return true for subdomains of known JS-heavy domains', () => {
      fc.assert(
        fc.property(
          jsHeavyDomainArb,
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => !s.includes('.')),
          fc.string({ maxLength: 500 }),
          (domain, subdomain, html) => {
            const url = `https://${subdomain}.${domain}/page`;

            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should return false for non-JS-heavy domains', () => {
      fc.assert(
        fc.property(
          fc.webUrl().filter((url) => {
            return !jsHeavyDomains.some((domain) => url.includes(domain));
          }),
          fc.string({ maxLength: 1000 }).filter((html) => {
            // Filter out HTML with SPA markers
            const spaMarkers = [
              '__NEXT_DATA__',
              'data-reactroot',
              'ng-app',
              'data-v-',
              '__NUXT__',
            ];
            return !spaMarkers.some((marker) => html.includes(marker));
          }),
          (url, html) => {
            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 3: SPA Marker Detection with Content Length
   *
   * For any HTML containing SPA markers, detection should return true only if
   * text content is less than 500 characters.
   *
   * Validates: Requirements 5.2
   */
  describe('Property 3: SPA Marker Detection with Content Length', () => {
    const spaMarkers = [
      '__NEXT_DATA__',
      'data-reactroot',
      'ng-app',
      'data-v-',
      '__NUXT__',
    ];

    const spaMarkerArb = fc.constantFrom(...spaMarkers);

    it('should return true for SPA markers with minimal content (< 500 chars)', () => {
      fc.assert(
        fc.property(
          spaMarkerArb,
          fc.string({ maxLength: 400 }), // Ensure content is < 500 chars
          fc.webUrl().filter((url) => {
            // Exclude known JS-heavy domains
            const jsHeavyDomains = [
              'tradingview.com',
              'dexscreener.com',
              'coingecko.com',
              'coinmarketcap.com',
            ];
            return !jsHeavyDomains.some((domain) => url.includes(domain));
          }),
          (marker, content, url) => {
            const html = `<html><body><div ${marker}>${content}</div></body></html>`;

            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return false for SPA markers with sufficient content (>= 500 chars)', () => {
      fc.assert(
        fc.property(
          spaMarkerArb,
          // Generate content with 'a' repeated 500+ times to ensure >= 500 chars after normalization
          fc.integer({ min: 500, max: 1000 }).map((n) => 'a'.repeat(n)),
          fc.webUrl().filter((url) => {
            // Exclude known JS-heavy domains
            const jsHeavyDomains = [
              'tradingview.com',
              'dexscreener.com',
              'coingecko.com',
              'coinmarketcap.com',
            ];
            return !jsHeavyDomains.some((domain) => url.includes(domain));
          }),
          (marker, content, url) => {
            const html = `<html><body><div ${marker}>${content}</div></body></html>`;

            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly extract text content by removing HTML tags', () => {
      fc.assert(
        fc.property(
          spaMarkerArb,
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 1,
            maxLength: 5,
          }),
          fc.webUrl().filter((url) => {
            const jsHeavyDomains = [
              'tradingview.com',
              'dexscreener.com',
              'coingecko.com',
              'coinmarketcap.com',
            ];
            return !jsHeavyDomains.some((domain) => url.includes(domain));
          }),
          (marker, textParts, url) => {
            // Create HTML with tags
            const htmlContent = textParts
              .map((text) => `<p>${text}</p>`)
              .join('');
            const html = `<html><body ${marker}>${htmlContent}</body></html>`;

            // Calculate expected text length (without tags)
            const expectedTextLength = textParts.join(' ').length;

            const result = detector.needsJsRendering(html, url);

            // Should return true if text content < 500, false otherwise
            expect(result).toBe(expectedTextLength < 500);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 4: Edge Cases with Random HTML
   *
   * For any random HTML without SPA markers and non-JS-heavy domains,
   * detection should return false.
   *
   * Validates: Requirements 5.4
   */
  describe('Property 4: Edge Cases with Random HTML', () => {
    it('should return false for random HTML without SPA markers', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 2000 }).filter((html) => {
            // Filter out HTML with SPA markers
            const spaMarkers = [
              '__NEXT_DATA__',
              'data-reactroot',
              'ng-app',
              'data-v-',
              '__NUXT__',
            ];
            return !spaMarkers.some((marker) => html.includes(marker));
          }),
          fc.webUrl().filter((url) => {
            // Filter out known JS-heavy domains
            const jsHeavyDomains = [
              'tradingview.com',
              'dexscreener.com',
              'coingecko.com',
              'coinmarketcap.com',
            ];
            return !jsHeavyDomains.some((domain) => url.includes(domain));
          }),
          (html, url) => {
            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle empty strings gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', ' ', '\n', '\t'),
          fc.constantFrom('', 'https://example.com'),
          (html, url) => {
            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(false);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle HTML with only whitespace', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => s.trim().length === 0),
          fc.webUrl(),
          (html, url) => {
            const result = detector.needsJsRendering(html, url);

            expect(result).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle malformed HTML gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 500 }),
          fc.webUrl(),
          (content, url) => {
            // Create malformed HTML (unclosed tags, etc.)
            const html = `<html><body><div>${content}`;

            // Should not throw, should return a boolean
            const result = detector.needsJsRendering(html, url);

            expect(typeof result).toBe('boolean');
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 5: Whitespace Normalization
   *
   * For any HTML with varying whitespace, text extraction should normalize
   * whitespace consistently.
   *
   * Validates: Requirements 5.2
   */
  describe('Property 5: Whitespace Normalization', () => {
    it('should normalize multiple spaces to single space', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 2,
            maxLength: 10,
          }),
          fc.integer({ min: 1, max: 10 }),
          fc.webUrl(),
          (words, spaceCount, url) => {
            // Create HTML with multiple spaces between words
            const spaces = ' '.repeat(spaceCount);
            const html = `<html><body data-reactroot>${words.join(spaces)}</body></html>`;

            // Calculate normalized text length (single spaces)
            const normalizedLength = words.join(' ').length;

            const result = detector.needsJsRendering(html, url);

            // Should return true if normalized text < 500, false otherwise
            expect(result).toBe(normalizedLength < 500);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should normalize newlines and tabs to spaces', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 2,
            maxLength: 10,
          }),
          fc.constantFrom('\n', '\t', '\r\n'),
          fc.webUrl(),
          (words, separator, url) => {
            // Create HTML with newlines/tabs between words
            const html = `<html><body data-reactroot>${words.join(separator)}</body></html>`;

            // Calculate normalized text length (single spaces)
            const normalizedLength = words.join(' ').length;

            const result = detector.needsJsRendering(html, url);

            // Should return true if normalized text < 500, false otherwise
            expect(result).toBe(normalizedLength < 500);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
