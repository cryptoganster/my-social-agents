import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IParsingStrategy,
  ParsingOptions,
  ExtractedMetadata,
} from '@/ingestion/content/domain/interfaces/services/parsing-strategy';
import {
  IFirecrawlClient,
  ScrapeOptions,
} from '@/ingestion/content/domain/interfaces/external/firecrawl-client';

/**
 * FirecrawlParsingStrategy
 *
 * Parsing strategy that uses Firecrawl for JavaScript-heavy websites.
 * This is a fallback strategy for sites that cannot be parsed with
 * standard HTML parsing due to heavy JavaScript rendering or anti-bot protection.
 *
 * Unlike other parsing strategies that receive HTML content, this strategy
 * receives a URL and fetches + renders the content itself using Firecrawl.
 *
 * Technology: Firecrawl (self-hosted)
 * - Browser-based rendering with Playwright
 * - Anti-bot bypass capabilities
 * - JavaScript execution support
 *
 * Requirements: 4.3
 */
@Injectable()
export class FirecrawlParsingStrategy implements IParsingStrategy {
  private readonly logger = new Logger(FirecrawlParsingStrategy.name);

  constructor(
    @Inject('IFirecrawlClient')
    private readonly firecrawlClient: IFirecrawlClient,
  ) {}

  /**
   * Parses content by scraping the URL with Firecrawl
   *
   * NOTE: Unlike other parsing strategies, rawContent is expected to be a URL,
   * not HTML content. The URL can also be passed via options.metadata.url.
   *
   * @param rawContent - URL to scrape (or empty if URL is in options)
   * @param options - Parsing options (URL can be in metadata)
   * @returns Markdown content from Firecrawl
   */
  async parse(rawContent: string, options?: ParsingOptions): Promise<string> {
    try {
      // Extract URL from rawContent or metadata
      const url = this.extractUrl(rawContent, options);

      if (!url) {
        this.logger.warn('No URL provided for Firecrawl parsing');
        return '';
      }

      this.logger.debug(`Scraping URL with Firecrawl: ${url}`);

      // Configure Firecrawl scraping options
      const scrapeOptions: ScrapeOptions = {
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 1000, // Wait for JS to render
        timeout: 30000, // 30 second timeout
      };

      // Scrape with Firecrawl
      const result = await this.firecrawlClient.scrape(url, scrapeOptions);

      if (!result.markdown) {
        this.logger.warn(`Firecrawl returned no markdown for URL: ${url}`);
        return '';
      }

      this.logger.debug(
        `Successfully scraped ${result.markdown.length} characters from ${url}`,
      );

      return result.markdown;
    } catch (error) {
      // Graceful error handling - log but don't throw
      this.logger.error(
        `Firecrawl parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return ''; // Return empty string on failure
    }
  }

  /**
   * Extracts metadata from scraped content
   *
   * @param rawContent - URL to scrape
   * @returns Extracted metadata from Firecrawl
   */
  async extractMetadata(rawContent: string): Promise<ExtractedMetadata> {
    try {
      const url = this.extractUrl(rawContent);

      if (!url) {
        this.logger.warn('No URL provided for metadata extraction');
        return {};
      }

      this.logger.debug(`Extracting metadata with Firecrawl: ${url}`);

      const scrapeOptions: ScrapeOptions = {
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 1000,
        timeout: 30000,
      };

      const result = await this.firecrawlClient.scrape(url, scrapeOptions);

      if (!result.metadata) {
        return {};
      }

      // Map Firecrawl metadata to ExtractedMetadata
      return {
        title: result.metadata.title,
        description: result.metadata.description,
        // Firecrawl doesn't provide author or publishedAt
        author: undefined,
        publishedAt: undefined,
        // Include source URL
        links: result.metadata.sourceURL ? [result.metadata.sourceURL] : [],
        images: result.metadata.ogImage ? [result.metadata.ogImage] : [],
      };
    } catch (error) {
      this.logger.warn(
        `Metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {};
    }
  }

  /**
   * Extracts URL from rawContent or options metadata
   *
   * @param rawContent - Raw content (expected to be URL)
   * @param options - Parsing options with potential metadata.url
   * @returns Extracted URL or null
   */
  private extractUrl(
    rawContent: string,
    options?: ParsingOptions,
  ): string | null {
    // Try rawContent first (if it looks like a URL)
    if (rawContent && this.isValidUrl(rawContent)) {
      return rawContent;
    }

    // Try options.metadata.url (if available)
    // Type guard for metadata with url
    const hasMetadataUrl = (
      obj: unknown,
    ): obj is { metadata: { url: string } } => {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        'metadata' in obj &&
        typeof obj.metadata === 'object' &&
        obj.metadata !== null &&
        'url' in obj.metadata &&
        typeof obj.metadata.url === 'string'
      );
    };

    if (hasMetadataUrl(options) && this.isValidUrl(options.metadata.url)) {
      return options.metadata.url;
    }

    return null;
  }

  /**
   * Validates if a string is a valid HTTP/HTTPS URL
   *
   * @param str - String to validate
   * @returns true if valid URL, false otherwise
   */
  private isValidUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
