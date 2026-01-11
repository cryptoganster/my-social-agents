import { JsRenderingDetector } from '../js-rendering-detector';

describe('JsRenderingDetector', () => {
  let detector: JsRenderingDetector;

  beforeEach(() => {
    detector = new JsRenderingDetector();
  });

  describe('Known Domain Detection', () => {
    it('should detect TradingView as JS-heavy', () => {
      const html = '<html><body>Some content</body></html>';
      const url = 'https://www.tradingview.com/chart/BTCUSD';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect DexScreener as JS-heavy', () => {
      const html = '<html><body>Token data</body></html>';
      const url = 'https://dexscreener.com/ethereum/0x123';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect CoinGecko as JS-heavy', () => {
      const html = '<html><body>Crypto prices</body></html>';
      const url = 'https://www.coingecko.com/en/coins/bitcoin';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect CoinMarketCap as JS-heavy', () => {
      const html = '<html><body>Market data</body></html>';
      const url = 'https://coinmarketcap.com/currencies/bitcoin/';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should not detect unknown domains as JS-heavy', () => {
      const html = '<html><body>Regular content</body></html>';
      const url = 'https://example.com/article';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should handle subdomain variations', () => {
      const html = '<html><body>Content</body></html>';
      const url = 'https://api.tradingview.com/data';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should handle URL with query parameters', () => {
      const html = '<html><body>Content</body></html>';
      const url = 'https://dexscreener.com/ethereum/0x123?tab=overview';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });
  });

  describe('SPA Framework Marker Detection', () => {
    it('should detect Next.js marker with minimal content', () => {
      const html = `
        <html>
          <body>
            <div id="__next"></div>
            <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect React marker with minimal content', () => {
      const html = `
        <html>
          <body>
            <div id="root" data-reactroot></div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect Angular marker with minimal content', () => {
      const html = `
        <html>
          <body>
            <app-root ng-app="myApp"></app-root>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect Vue marker with minimal content', () => {
      const html = `
        <html>
          <body>
            <div id="app" data-v-123abc></div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should detect Nuxt.js marker with minimal content', () => {
      const html = `
        <html>
          <body>
            <div id="__nuxt"></div>
            <script>window.__NUXT__={}</script>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should not detect SPA with sufficient content', () => {
      const html = `
        <html>
          <body>
            <div id="__next"></div>
            <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
            <main>
              ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
                20,
              )}
            </main>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should handle HTML with no SPA markers', () => {
      const html = `
        <html>
          <body>
            <h1>Regular HTML Page</h1>
            <p>This is a regular server-rendered page.</p>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });
  });

  describe('Minimal Content Detection', () => {
    it('should detect minimal content (< 500 chars) with SPA marker', () => {
      const html = `
        <html>
          <body>
            <div data-reactroot>
              <p>Short content</p>
            </div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should not detect sufficient content (>= 500 chars) with SPA marker', () => {
      const longContent = 'a'.repeat(500);
      const html = `
        <html>
          <body>
            <div data-reactroot>
              <p>${longContent}</p>
            </div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should extract text content correctly by removing HTML tags', () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <div data-reactroot>
              <h1>Title</h1>
              <p>Paragraph</p>
            </div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      // Text content: "Test Title Paragraph" (< 500 chars)
      expect(result).toBe(true);
    });

    it('should normalize whitespace when extracting text', () => {
      const html = `
        <html>
          <body data-reactroot>
            <p>Text   with    multiple     spaces</p>
            <p>
              Text
              with
              newlines
            </p>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });
  });

  describe('Combined Heuristics', () => {
    it('should prioritize known domain over content analysis', () => {
      // Even with lots of content, known domain should trigger JS rendering
      const longContent = 'a'.repeat(1000);
      const html = `<html><body>${longContent}</body></html>`;
      const url = 'https://tradingview.com/chart';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should require both SPA marker AND minimal content', () => {
      // SPA marker present but sufficient content
      const longContent = 'a'.repeat(600);
      const html = `
        <html>
          <body>
            <div data-reactroot>${longContent}</div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should not trigger on minimal content without SPA marker', () => {
      const html = '<html><body><p>Short</p></body></html>';
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should handle empty HTML', () => {
      const html = '';
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should handle empty URL', () => {
      const html = '<html><body>Content</body></html>';
      const url = '';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });

    it('should handle both empty HTML and URL', () => {
      const html = '';
      const url = '';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed HTML', () => {
      const html = '<html><body><div data-reactroot>Unclosed div';
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should handle HTML with special characters', () => {
      const html = `
        <html>
          <body data-reactroot>
            <p>Special chars: &lt; &gt; &amp; &quot;</p>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should handle HTML with unicode characters', () => {
      const html = `
        <html>
          <body data-reactroot>
            <p>Unicode: 你好 مرحبا 🌍</p>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should handle URL with special characters', () => {
      const html = '<html><body>Content</body></html>';
      const url = 'https://tradingview.com/chart?symbol=BTC%2FUSD';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });

    it('should be case-sensitive for domain matching', () => {
      const html = '<html><body>Content</body></html>';
      const url = 'https://TRADINGVIEW.COM/chart';

      // Should still match because includes() is case-sensitive but domain is lowercase
      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(false); // Won't match due to case
    });

    it('should handle multiple SPA markers', () => {
      const html = `
        <html>
          <body>
            <div data-reactroot data-v-123>
              <script id="__NEXT_DATA__"></script>
            </div>
          </body>
        </html>
      `;
      const url = 'https://example.com';

      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });
  });

  describe('Domain Service Characteristics', () => {
    it('should be stateless - same input produces same output', () => {
      const html = '<html><body data-reactroot>Test</body></html>';
      const url = 'https://example.com';

      const result1 = detector.needsJsRendering(html, url);
      const result2 = detector.needsJsRendering(html, url);
      const result3 = detector.needsJsRendering(html, url);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should not maintain state between calls', () => {
      detector.needsJsRendering(
        '<html><body>Test1</body></html>',
        'https://example.com',
      );
      detector.needsJsRendering(
        '<html><body>Test2</body></html>',
        'https://tradingview.com',
      );
      const result = detector.needsJsRendering(
        '<html><body>Test3</body></html>',
        'https://example.com',
      );

      // Each call should be independent
      expect(result).toBe(false);
    });

    it('should have no side effects', () => {
      const html = '<html><body data-reactroot>Test</body></html>';
      const url = 'https://example.com';

      // Multiple calls should not affect each other
      detector.needsJsRendering(html, url);
      detector.needsJsRendering(html, url);
      const result = detector.needsJsRendering(html, url);

      expect(result).toBe(true);
    });
  });
});
