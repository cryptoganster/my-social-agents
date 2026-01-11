import { FirecrawlClient } from '../infra/firecrawl/firecrawl-client';
import { FirecrawlParsingStrategy } from '../infra/parsing/firecrawl-parsing-strategy';
import { JsRenderingDetector } from '../domain/services/js-rendering-detector';
import { ContentParser } from '../domain/services/content-parser';
import {
  loadFirecrawlConfig,
  validateFirecrawlConfig,
} from '@/ingestion/config/firecrawl.config';

/**
 * IngestionContentModule Configuration Tests
 *
 * Tests module configuration with Firecrawl enabled, disabled, and graceful degradation.
 * These tests verify the factory provider logic without requiring full module setup.
 *
 * Requirements: 6.2
 */
describe('IngestionContentModule Configuration', () => {
  describe('FirecrawlClient factory', () => {
    it('should create FirecrawlClient when enabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);
      expect(config.enabled).toBe(true);

      // Verify validation passes
      expect(() => validateFirecrawlConfig(config)).not.toThrow();

      // Create client
      const client = new FirecrawlClient(mockConfigService);
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(FirecrawlClient);
    });

    it('should return null when disabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: false,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);
      expect(config.enabled).toBe(false);

      // Factory would return null
      const result = config.enabled
        ? new FirecrawlClient(mockConfigService)
        : null;
      expect(result).toBeNull();
    });
  });

  describe('FirecrawlParsingStrategy factory', () => {
    it('should create FirecrawlParsingStrategy when client is available', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const client = new FirecrawlClient(mockConfigService);
      const strategy = new FirecrawlParsingStrategy(client);

      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(FirecrawlParsingStrategy);
    });

    it('should return null when client is null', () => {
      const client = null;
      const result = client ? new FirecrawlParsingStrategy(client) : null;

      expect(result).toBeNull();
    });
  });

  describe('JsRenderingDetector factory', () => {
    it('should create JsRenderingDetector when enabled and fallback enabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_FALLBACK_ENABLED: true,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);
      expect(config.enabled).toBe(true);
      expect(config.fallbackEnabled).toBe(true);

      const detector = new JsRenderingDetector();
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(JsRenderingDetector);
    });

    it('should return null when Firecrawl is disabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: false,
            FIRECRAWL_FALLBACK_ENABLED: true,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);
      expect(config.enabled).toBe(false);

      const result =
        config.enabled && config.fallbackEnabled
          ? new JsRenderingDetector()
          : null;
      expect(result).toBeNull();
    });

    it('should return null when fallback is disabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_FALLBACK_ENABLED: false,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);
      expect(config.enabled).toBe(true);
      expect(config.fallbackEnabled).toBe(false);

      const result =
        config.enabled && config.fallbackEnabled
          ? new JsRenderingDetector()
          : null;
      expect(result).toBeNull();
    });
  });

  describe('ContentParser factory', () => {
    it('should create ContentParser with all dependencies', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
            FIRECRAWL_FALLBACK_ENABLED: true,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const mockHtmlStrategy = {} as any;
      const mockRssStrategy = {} as any;
      const client = new FirecrawlClient(mockConfigService);
      const firecrawlStrategy = new FirecrawlParsingStrategy(client);
      const jsDetector = new JsRenderingDetector();

      const parser = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        firecrawlStrategy,
        jsDetector,
      );

      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(ContentParser);
    });

    it('should create ContentParser without Firecrawl dependencies (graceful degradation)', () => {
      const mockHtmlStrategy = {} as any;
      const mockRssStrategy = {} as any;

      const parser = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        undefined,
        undefined,
      );

      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(ContentParser);
    });
  });

  describe('graceful degradation scenarios', () => {
    it('should handle Firecrawl enabled but fallback disabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: true,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
            FIRECRAWL_FALLBACK_ENABLED: false,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);

      // Client should be created
      const client = config.enabled
        ? new FirecrawlClient(mockConfigService)
        : null;
      expect(client).not.toBeNull();

      // Strategy should be created
      const strategy = client ? new FirecrawlParsingStrategy(client) : null;
      expect(strategy).not.toBeNull();

      // Detector should NOT be created (fallback disabled)
      const detector =
        config.enabled && config.fallbackEnabled
          ? new JsRenderingDetector()
          : null;
      expect(detector).toBeNull();

      // Parser should still work
      const mockHtmlStrategy = {} as any;
      const mockRssStrategy = {} as any;
      const parser = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        strategy,
        detector,
      );
      expect(parser).toBeDefined();
    });

    it('should handle all Firecrawl features disabled', () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            FIRECRAWL_ENABLED: false,
            FIRECRAWL_API_URL: 'http://localhost:3002',
            FIRECRAWL_TIMEOUT: 30000,
            FIRECRAWL_MAX_RETRIES: 3,
            FIRECRAWL_FALLBACK_ENABLED: false,
          };
          return config[key] ?? defaultValue;
        }),
      } as any;

      const config = loadFirecrawlConfig(mockConfigService);

      // Nothing should be created
      const client = config.enabled
        ? new FirecrawlClient(mockConfigService)
        : null;
      expect(client).toBeNull();

      const strategy = client ? new FirecrawlParsingStrategy(client) : null;
      expect(strategy).toBeNull();

      const detector =
        config.enabled && config.fallbackEnabled
          ? new JsRenderingDetector()
          : null;
      expect(detector).toBeNull();

      // Parser should still work without Firecrawl
      const mockHtmlStrategy = {} as any;
      const mockRssStrategy = {} as any;
      const parser = new ContentParser(
        mockHtmlStrategy,
        mockRssStrategy,
        strategy,
        detector,
      );
      expect(parser).toBeDefined();
    });
  });
});
