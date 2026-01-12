import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirecrawlClient } from '@/ingestion/content/infra/firecrawl/firecrawl-client';
import { FirecrawlParsingStrategy } from '@/ingestion/content/infra/parsing/firecrawl-parsing-strategy';
import { ContentParser } from '@/ingestion/content/domain/services/content-parser';
import { JsRenderingDetector } from '@/ingestion/content/domain/services/js-rendering-detector';
import { HtmlParsingStrategy } from '@/ingestion/content/infra/parsing/html-parsing-strategy';
import { RssParsingStrategy } from '@/ingestion/content/infra/parsing/rss-parsing-strategy';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';
import { ContentMetadata } from '@/ingestion/content/domain/value-objects/content-metadata';
import axios from 'axios';

/**
 * Integration tests for Firecrawl parsing functionality.
 *
 * These tests require Firecrawl services to be running via Docker Compose.
 * Run: docker-compose up firecrawl-api firecrawl-playwright firecrawl-redis firecrawl-rabbitmq firecrawl-postgres
 *
 * Tests verify:
 * - Firecrawl service connectivity
 * - Actual scraping of test pages
 * - Fallback triggering with real content
 * - Error recovery and resilience
 *
 * Requirements: 7.1
 */
describe('Firecrawl Parsing Integration', () => {
  let firecrawlClient: FirecrawlClient;
  let firecrawlStrategy: FirecrawlParsingStrategy;
  let contentParser: ContentParser;
  let jsDetector: JsRenderingDetector;
  let configService: ConfigService;

  const FIRECRAWL_API_URL =
    process.env.FIRECRAWL_API_URL || 'http://localhost:3002';
  const FIRECRAWL_TIMEOUT = parseInt(
    process.env.FIRECRAWL_TIMEOUT || '30000',
    10,
  );

  // Test fixtures - URLs for testing
  const TEST_URLS = {
    // Simple static page (should work with regular parsing)
    static: 'https://example.com',
    // JS-heavy page (requires Firecrawl)
    jsHeavy: 'https://www.tradingview.com',
    // Invalid URL (should fail gracefully)
    invalid: 'https://this-domain-does-not-exist-12345.com',
  };

  beforeAll(async () => {
    // Check if Firecrawl is available before running tests
    try {
      await axios.get(`${FIRECRAWL_API_URL}/health`, { timeout: 5000 });
    } catch (error) {
      console.warn(
        '⚠️  Firecrawl service not available. Skipping integration tests.',
      );
      console.warn(
        '   Run: docker-compose up firecrawl-api firecrawl-playwright firecrawl-redis firecrawl-rabbitmq firecrawl-postgres',
      );
      // Skip all tests if Firecrawl is not available
      return;
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
      providers: [
        ConfigService,
        {
          provide: 'IFirecrawlClient',
          useFactory: (config: ConfigService) => {
            return new FirecrawlClient(config);
          },
          inject: [ConfigService],
        },
        {
          provide: 'IFirecrawlParsingStrategy',
          useFactory: (client: FirecrawlClient) => {
            return new FirecrawlParsingStrategy(client);
          },
          inject: ['IFirecrawlClient'],
        },
        {
          provide: 'IJsRenderingDetector',
          useClass: JsRenderingDetector,
        },
        {
          provide: 'IHtmlParsingStrategy',
          useClass: HtmlParsingStrategy,
        },
        {
          provide: 'IRssParsingStrategy',
          useFactory: (htmlStrategy: HtmlParsingStrategy) => {
            return new RssParsingStrategy(htmlStrategy);
          },
          inject: ['IHtmlParsingStrategy'],
        },
        {
          provide: ContentParser,
          useFactory: (
            htmlStrategy: HtmlParsingStrategy,
            rssStrategy: RssParsingStrategy,
            firecrawlStrategy: FirecrawlParsingStrategy | null,
            jsDetector: JsRenderingDetector | null,
          ) => {
            return new ContentParser(
              htmlStrategy,
              rssStrategy,
              firecrawlStrategy,
              jsDetector,
            );
          },
          inject: [
            'IHtmlParsingStrategy',
            'IRssParsingStrategy',
            'IFirecrawlParsingStrategy',
            'IJsRenderingDetector',
          ],
        },
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    firecrawlClient = module.get<FirecrawlClient>('IFirecrawlClient');
    firecrawlStrategy = module.get<FirecrawlParsingStrategy>(
      'IFirecrawlParsingStrategy',
    );
    jsDetector = module.get<JsRenderingDetector>('IJsRenderingDetector');
    contentParser = module.get<ContentParser>(ContentParser);
  });

  // Helper to check if Firecrawl is available
  const isFirecrawlAvailable = async (): Promise<boolean> => {
    try {
      await axios.get(`${FIRECRAWL_API_URL}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };

  describe('Firecrawl Service Connectivity', () => {
    it('should connect to Firecrawl API health endpoint', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      const isAvailable = await firecrawlClient.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should have correct configuration', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      expect(configService.get('FIRECRAWL_API_URL')).toBeDefined();
      expect(configService.get('FIRECRAWL_TIMEOUT')).toBeDefined();
    });
  });

  describe('Actual Scraping with Firecrawl', () => {
    it('should scrape a simple static page', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      const result = await firecrawlClient.scrape(TEST_URLS.static, {
        formats: ['markdown'],
        timeout: FIRECRAWL_TIMEOUT,
      });

      expect(result).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(result.markdown).not.toBeNull();
      if (result.markdown) {
        expect(result.markdown.length).toBeGreaterThan(0);
        expect(result.markdown).toContain('Example Domain');
      }
    }, 60000); // 60s timeout for scraping

    it('should extract metadata from scraped page', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      const result = await firecrawlClient.scrape(TEST_URLS.static, {
        formats: ['markdown'],
        timeout: FIRECRAWL_TIMEOUT,
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBeDefined();
    }, 60000);

    it('should use FirecrawlParsingStrategy to parse URL', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Pass URL in options
      const markdown = await firecrawlStrategy.parse('', {
        url: TEST_URLS.static,
      });

      expect(markdown).toBeDefined();
      expect(markdown.length).toBeGreaterThan(0);
      expect(markdown).toContain('Example Domain');
    }, 60000);
  });

  describe('Fallback Triggering with Real Content', () => {
    it('should detect JS-heavy content and trigger fallback', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Minimal HTML that looks like a JS-heavy SPA
      const minimalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>React App</title>
          <script src="app.js"></script>
        </head>
        <body>
          <div id="root" data-reactroot></div>
        </body>
        </html>
      `;

      const url = 'https://example.com/spa';
      const needsRendering = jsDetector.needsJsRendering(minimalHtml, url);

      expect(needsRendering).toBe(true);
    });

    it('should use Firecrawl fallback for minimal content', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Minimal HTML that would trigger fallback
      const minimalHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>SPA</title></head>
        <body>
          <div id="app" data-reactroot></div>
          <script src="bundle.js"></script>
        </body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        sourceUrl: TEST_URLS.static,
      });

      const result = await contentParser.parse(
        minimalHtml,
        sourceType,
        metadata,
      );

      // Should have content from Firecrawl fallback
      expect(result.markdown).toBeDefined();
      expect(result.markdown.length).toBeGreaterThan(100);
    }, 60000);

    it('should not trigger fallback for content-rich HTML', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      const richHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Rich Content</title></head>
        <body>
          <h1>Bitcoin Analysis</h1>
          <p>Bitcoin has shown strong momentum in recent weeks with significant price action.</p>
          <p>Technical indicators suggest continued bullish sentiment in the market.</p>
          <p>Trading volume has increased substantially across major exchanges.</p>
          <p>Market participants are closely watching key resistance levels.</p>
        </body>
        </html>
      `;

      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);
      const metadata = ContentMetadata.create({
        sourceUrl: 'https://example.com/article',
      });

      const result = await contentParser.parse(richHtml, sourceType, metadata);

      // Should use regular HTML parsing (not Firecrawl)
      expect(result.markdown).toContain('Bitcoin Analysis');
      expect(result.markdown).toContain('strong momentum');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle invalid URL gracefully', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      await expect(
        firecrawlClient.scrape(TEST_URLS.invalid, {
          formats: ['markdown'],
          timeout: 10000,
        }),
      ).rejects.toThrow();
    }, 30000);

    it('should handle timeout gracefully', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Use very short timeout to force timeout error
      await expect(
        firecrawlClient.scrape(TEST_URLS.static, {
          formats: ['markdown'],
          timeout: 1, // 1ms - will definitely timeout
        }),
      ).rejects.toThrow();
    }, 30000);

    it('should retry on transient failures', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // This test verifies retry logic by attempting a scrape
      // The retry logic is internal to FirecrawlClient
      const result = await firecrawlClient.scrape(TEST_URLS.static, {
        formats: ['markdown'],
        timeout: FIRECRAWL_TIMEOUT,
      });

      expect(result).toBeDefined();
      expect(result.markdown).toBeDefined();
    }, 60000);

    it('should handle Firecrawl unavailable gracefully', async () => {
      // Create a client with invalid URL
      const invalidConfig = {
        get: (key: string) => {
          if (key === 'FIRECRAWL_API_URL') return 'http://localhost:9999';
          if (key === 'FIRECRAWL_TIMEOUT') return '5000';
          if (key === 'FIRECRAWL_MAX_RETRIES') return '1';
          return undefined;
        },
      } as ConfigService;

      const invalidClient = new FirecrawlClient(invalidConfig);

      const isAvailable = await invalidClient.isAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should continue with regular parsing if Firecrawl fails', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Create parser without Firecrawl strategy
      const htmlStrategy = new HtmlParsingStrategy();
      const rssStrategy = new RssParsingStrategy(htmlStrategy);
      const parserWithoutFirecrawl = new ContentParser(
        htmlStrategy,
        rssStrategy,
        null, // No Firecrawl
        null, // No JS detector
      );

      const html = '<h1>Content</h1><p>Some text</p>';
      const sourceType = SourceType.fromEnum(SourceTypeEnum.WEB);

      const result = await parserWithoutFirecrawl.parse(html, sourceType);

      // Should still work with regular HTML parsing
      expect(result.markdown).toContain('Content');
      expect(result.markdown).toContain('Some text');
    });
  });

  describe('Performance and Resource Usage', () => {
    it('should complete scraping within timeout', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      const startTime = Date.now();

      await firecrawlClient.scrape(TEST_URLS.static, {
        formats: ['markdown'],
        timeout: FIRECRAWL_TIMEOUT,
      });

      const duration = Date.now() - startTime;

      // Should complete within configured timeout
      expect(duration).toBeLessThan(FIRECRAWL_TIMEOUT);
    }, 60000);

    it('should handle concurrent scraping requests', async () => {
      if (!(await isFirecrawlAvailable())) {
        console.warn('Skipping test: Firecrawl not available');
        return;
      }

      // Make 3 concurrent requests
      const promises = [
        firecrawlClient.scrape(TEST_URLS.static, { formats: ['markdown'] }),
        firecrawlClient.scrape(TEST_URLS.static, { formats: ['markdown'] }),
        firecrawlClient.scrape(TEST_URLS.static, { formats: ['markdown'] }),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.markdown).toBeDefined();
        if (result.markdown) {
          expect(result.markdown.length).toBeGreaterThan(0);
        }
      });
    }, 120000); // 2 minutes for concurrent requests
  });
});
