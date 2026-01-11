import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IFirecrawlClient,
  ScrapeOptions,
  ScrapeResult,
} from '@/ingestion/content/domain/interfaces/external/firecrawl-client';

/**
 * FirecrawlClient
 *
 * HTTP adapter for self-hosted Firecrawl service.
 * Provides JavaScript rendering and anti-bot bypass capabilities
 * for websites that cannot be parsed with standard HTML parsing.
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Circuit breaker pattern (optional)
 * - Health check support
 *
 * Technology: Node.js built-in fetch API
 *
 * Requirements: 4.2
 */
@Injectable()
export class FirecrawlClient implements IFirecrawlClient {
  private readonly logger = new Logger(FirecrawlClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  // Circuit breaker state
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerResetTime = 60000; // 1 minute

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('FIRECRAWL_API_URL') ||
      'http://localhost:3002';
    this.timeout = this.configService.get<number>('FIRECRAWL_TIMEOUT') || 30000;
    this.maxRetries =
      this.configService.get<number>('FIRECRAWL_MAX_RETRIES') || 3;
    this.retryDelay =
      this.configService.get<number>('FIRECRAWL_RETRY_DELAY') || 1000;
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error(
        'Firecrawl service circuit breaker is open. Service may be unavailable.',
      );
    }

    const scrapeOptions: ScrapeOptions = {
      formats: options?.formats || ['markdown'],
      waitFor: options?.waitFor || 1000,
      timeout: options?.timeout || this.timeout,
      onlyMainContent: options?.onlyMainContent ?? true,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Scraping URL: ${url} (attempt ${attempt}/${this.maxRetries})`,
        );

        const result = await this.performScrape(url, scrapeOptions);

        // Reset circuit breaker on success
        this.resetCircuitBreaker();

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          `Scrape attempt ${attempt}/${this.maxRetries} failed: ${lastError.message}`,
        );

        // Don't retry on client errors (4xx)
        if (this.isClientError(error)) {
          this.recordFailure();
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.recordFailure();
    throw new Error(
      `Firecrawl scrape failed after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      this.logger.warn(
        `Firecrawl health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  private async performScrape(
    url: string,
    options: ScrapeOptions,
  ): Promise<ScrapeResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.timeout,
    );

    try {
      const response = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: options.formats,
          waitFor: options.waitFor,
          onlyMainContent: options.onlyMainContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Firecrawl API error (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();

      return this.mapToScrapeResult(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Firecrawl scrape timeout after ${options.timeout || this.timeout}ms`,
        );
      }

      throw error;
    }
  }

  private mapToScrapeResult(data: any): ScrapeResult {
    return {
      markdown: data.data?.markdown || data.markdown,
      html: data.data?.html || data.html,
      rawHtml: data.data?.rawHtml || data.rawHtml,
      metadata: {
        title: data.data?.metadata?.title || data.metadata?.title,
        description:
          data.data?.metadata?.description || data.metadata?.description,
        ogImage: data.data?.metadata?.ogImage || data.metadata?.ogImage,
        sourceURL: data.data?.metadata?.sourceURL || data.metadata?.sourceURL,
        statusCode:
          data.data?.metadata?.statusCode || data.metadata?.statusCode,
        contentType:
          data.data?.metadata?.contentType || data.metadata?.contentType,
      },
    };
  }

  private isClientError(error: unknown): boolean {
    if (error instanceof Error && error.message.includes('(4')) {
      return true;
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Circuit breaker methods
  private isCircuitOpen(): boolean {
    if (this.failureCount < this.circuitBreakerThreshold) {
      return false;
    }

    if (
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime > this.circuitBreakerResetTime
    ) {
      this.logger.log('Circuit breaker reset - attempting to reconnect');
      this.resetCircuitBreaker();
      return false;
    }

    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.logger.error(
        `Circuit breaker opened after ${this.failureCount} failures`,
      );
    }
  }

  private resetCircuitBreaker(): void {
    if (this.failureCount > 0) {
      this.logger.log('Circuit breaker reset - service recovered');
    }
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}
