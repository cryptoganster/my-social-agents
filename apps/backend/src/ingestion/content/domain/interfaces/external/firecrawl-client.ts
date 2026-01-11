/**
 * ScrapeOptions
 *
 * Configuration options for Firecrawl scraping operations.
 */
export interface ScrapeOptions {
  /**
   * Output formats to request from Firecrawl
   * @default ['markdown']
   */
  readonly formats?: ('markdown' | 'html' | 'rawHtml')[];

  /**
   * Time to wait for JavaScript rendering (milliseconds)
   * @default 1000
   */
  readonly waitFor?: number;

  /**
   * Request timeout (milliseconds)
   * @default 30000
   */
  readonly timeout?: number;

  /**
   * Whether to extract only main content
   * @default true
   */
  readonly onlyMainContent?: boolean;
}

/**
 * ScrapeMetadata
 *
 * Metadata extracted by Firecrawl during scraping.
 */
export interface ScrapeMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly ogImage?: string;
  readonly sourceURL?: string;
  readonly statusCode?: number;
  readonly contentType?: string;
}

/**
 * ScrapeResult
 *
 * Result of a Firecrawl scraping operation.
 */
export interface ScrapeResult {
  readonly markdown?: string;
  readonly html?: string;
  readonly rawHtml?: string;
  readonly metadata?: ScrapeMetadata;
}

/**
 * IFirecrawlClient Interface
 *
 * Abstraction for Firecrawl API client operations.
 * Provides JavaScript rendering and anti-bot bypass capabilities
 * for websites that cannot be parsed with standard HTML parsing.
 *
 * This is used as a fallback strategy when:
 * - Content is minimal after standard HTML parsing
 * - Website uses heavy JavaScript rendering (SPAs)
 * - Website has anti-bot protection
 *
 * Implementation:
 * - FirecrawlClient: HTTP adapter for self-hosted Firecrawl service
 *
 * Requirements: 4.1
 */
export interface IFirecrawlClient {
  /**
   * Scrapes a URL using Firecrawl with JavaScript rendering
   *
   * @param url - URL to scrape
   * @param options - Scraping configuration options
   * @returns Scraped content with markdown and metadata
   * @throws Error if scraping fails or service is unavailable
   */
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;

  /**
   * Checks if Firecrawl service is available and healthy
   *
   * @returns true if service is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}
