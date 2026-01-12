import { ConfigService } from '@nestjs/config';
import { FirecrawlClient } from '../firecrawl-client';
import { ScrapeOptions } from '@/ingestion/content/domain/interfaces/external/firecrawl-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('FirecrawlClient', () => {
  let client: FirecrawlClient;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();

    // Create mock config service
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          FIRECRAWL_API_URL: 'http://localhost:3002',
          FIRECRAWL_TIMEOUT: 30000,
          FIRECRAWL_MAX_RETRIES: 3,
          FIRECRAWL_RETRY_DELAY: 1000,
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    client = new FirecrawlClient(mockConfigService);
  });

  describe('scrape', () => {
    describe('successful scraping', () => {
      it('should scrape URL successfully with default options', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: {
              markdown: '# Test Content',
              html: '<h1>Test Content</h1>',
              metadata: {
                title: 'Test Page',
                description: 'Test description',
              },
            },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await client.scrape('https://example.com');

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3002/v1/scrape',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: 'https://example.com',
              formats: ['markdown'],
              waitFor: 1000,
              onlyMainContent: true,
            }),
          }),
        );

        expect(result.markdown).toBe('# Test Content');
        expect(result.html).toBe('<h1>Test Content</h1>');
        expect(result.metadata?.title).toBe('Test Page');
      });

      it('should scrape URL with custom options', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: {
              markdown: '# Custom Content',
              html: '<h1>Custom Content</h1>',
              rawHtml: '<html>...</html>',
            },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const options: ScrapeOptions = {
          formats: ['markdown', 'html', 'rawHtml'],
          waitFor: 2000,
          timeout: 60000,
          onlyMainContent: false,
        };

        const result = await client.scrape('https://example.com', options);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3002/v1/scrape',
          expect.objectContaining({
            body: JSON.stringify({
              url: 'https://example.com',
              formats: ['markdown', 'html', 'rawHtml'],
              waitFor: 2000,
              onlyMainContent: false,
            }),
          }),
        );

        expect(result.markdown).toBe('# Custom Content');
        expect(result.rawHtml).toBe('<html>...</html>');
      });

      it('should handle response with nested data structure', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: {
              markdown: '# Nested',
              metadata: {
                title: 'Nested Title',
                statusCode: 200,
                contentType: 'text/html',
              },
            },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await client.scrape('https://example.com');

        expect(result.metadata?.title).toBe('Nested Title');
        expect(result.metadata?.statusCode).toBe(200);
        expect(result.metadata?.contentType).toBe('text/html');
      });

      it('should handle response with flat data structure', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            markdown: '# Flat',
            metadata: {
              title: 'Flat Title',
            },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await client.scrape('https://example.com');

        expect(result.markdown).toBe('# Flat');
        expect(result.metadata?.title).toBe('Flat Title');
      });
    });

    describe('error handling', () => {
      it('should throw error on HTTP error response', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal Server Error'),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(client.scrape('https://example.com')).rejects.toThrow(
          'Firecrawl API error (500): Internal Server Error',
        );
      });

      it('should throw error on 404 response', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValue('Not Found'),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(client.scrape('https://example.com')).rejects.toThrow(
          'Firecrawl API error (404): Not Found',
        );
      });

      it('should not retry on client errors (4xx)', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Bad Request'),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(client.scrape('https://example.com')).rejects.toThrow();

        // Should only be called once (no retries for client errors)
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should handle network errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
          new Error('Network error'),
        );

        await expect(client.scrape('https://example.com')).rejects.toThrow(
          'Firecrawl scrape failed after 3 attempts',
        );
      });

      it('should handle JSON parse errors', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(client.scrape('https://example.com')).rejects.toThrow();
      });
    });

    describe('timeout handling', () => {
      it('should handle timeout errors', async () => {
        // Mock fetch to throw an AbortError
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        (global.fetch as jest.Mock).mockRejectedValue(abortError);

        await expect(
          client.scrape('https://example.com', { timeout: 100 }),
        ).rejects.toThrow('Firecrawl scrape timeout after 100ms');
      });

      it('should use default timeout when not specified', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: { markdown: '# Success' },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await client.scrape('https://example.com');
        expect(result.markdown).toBe('# Success');
      });
    });

    describe('retry logic', () => {
      it('should retry on server errors (5xx)', async () => {
        const mockErrorResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server Error'),
        };

        const mockSuccessResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: { markdown: '# Success' },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockErrorResponse)
          .mockResolvedValueOnce(mockErrorResponse)
          .mockResolvedValueOnce(mockSuccessResponse);

        const result = await client.scrape('https://example.com');

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(result.markdown).toBe('# Success');
      });

      it('should retry with exponential backoff', async () => {
        const mockErrorResponse = {
          ok: false,
          status: 503,
          text: jest.fn().mockResolvedValue('Service Unavailable'),
        };

        const mockSuccessResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: { markdown: '# Success' },
          }),
          text: jest.fn(),
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce(mockErrorResponse)
          .mockResolvedValueOnce(mockSuccessResponse);

        const startTime = Date.now();
        await client.scrape('https://example.com');
        const duration = Date.now() - startTime;

        // Should have waited at least 1000ms (first retry delay)
        expect(duration).toBeGreaterThanOrEqual(1000);
      });

      it('should fail after max retries', async () => {
        const mockErrorResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server Error'),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

        await expect(client.scrape('https://example.com')).rejects.toThrow(
          'Firecrawl scrape failed after 3 attempts',
        );

        expect(global.fetch).toHaveBeenCalledTimes(3);
      });
    });

    describe('circuit breaker', () => {
      it('should open circuit after threshold failures', async () => {
        const mockErrorResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server Error'),
        };

        (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);

        // Trigger 5 failures (threshold) - each will retry 3 times
        for (let i = 0; i < 5; i++) {
          await expect(client.scrape('https://example.com')).rejects.toThrow();
        }

        // Next call should fail immediately due to open circuit
        await expect(client.scrape('https://example.com')).rejects.toThrow(
          'circuit breaker is open',
        );

        // Should not have made additional fetch calls
        expect(global.fetch).toHaveBeenCalledTimes(15); // 5 failures * 3 retries each
      }, 20000); // Increase timeout to 20 seconds

      it('should reset circuit breaker on successful request', async () => {
        const mockErrorResponse = {
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Server Error'),
        };

        const mockSuccessResponse = {
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            data: { markdown: '# Success' },
          }),
          text: jest.fn(),
        };

        // Trigger some failures
        (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse);
        await expect(client.scrape('https://example.com')).rejects.toThrow();

        // Then succeed
        (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse);
        await client.scrape('https://example.com');

        // Circuit should be reset, next call should work
        const result = await client.scrape('https://example.com');
        expect(result.markdown).toBe('# Success');
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when health check succeeds', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3002/health',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should return false when health check fails', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it('should handle timeout on health check', async () => {
      // Mock fetch to throw an AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const result = await client.isAvailable();

      expect(result).toBe(false);
    });
  });
});
