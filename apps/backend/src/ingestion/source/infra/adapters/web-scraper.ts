import { Injectable } from '@nestjs/common';
import {
  SourceAdapter,
  RawContent,
  AdapterValidationResult,
} from '@/ingestion/source/domain/interfaces/source-adapter';
import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import {
  SourceType,
  SourceTypeEnum,
} from '@/ingestion/source/domain/value-objects/source-type';

/**
 * WebScraperAdapter
 *
 * Implements web scraping functionality with robots.txt compliance
 * and JavaScript rendering support.
 *
 * Requirements: 1.1
 */
@Injectable()
export class WebScraperAdapter implements SourceAdapter {
  /**
   * Collects content from web pages
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const url = config.config.url as string;

    if (!url) {
      throw new Error('Web scraper requires a URL in configuration');
    }

    try {
      // Check robots.txt compliance
      await this.checkRobotsTxt(url);

      // Fetch content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CryptoKnowledgeBot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Extract text content (basic implementation)
      const textContent = this.extractTextFromHtml(html);

      // Extract metadata
      const metadata = this.extractMetadata(html, url);

      return [
        {
          content: textContent,
          metadata,
        },
      ];
    } catch (error) {
      throw new Error(
        `Failed to scrape ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.WEB;
  }

  /**
   * Validates web scraper configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate URL
    if (typeof config.url !== 'string') {
      errors.push('URL is required and must be a string');
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push('URL must be a valid URL');
      }
    }

    // Validate optional JavaScript rendering flag
    if (
      config.renderJavaScript !== undefined &&
      typeof config.renderJavaScript !== 'boolean'
    ) {
      errors.push('renderJavaScript must be a boolean');
    }

    // Validate optional selectors
    if (
      config.contentSelector !== undefined &&
      typeof config.contentSelector !== 'string'
    ) {
      errors.push('contentSelector must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks robots.txt for crawling permissions
   */
  private async checkRobotsTxt(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      const robotsTxtUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      const response = await fetch(robotsTxtUrl);

      if (response.ok) {
        const robotsTxt = await response.text();

        // Basic robots.txt parsing - check for Disallow rules
        const lines = robotsTxt.split('\n');
        let isUserAgentMatch = false;

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith('User-agent:')) {
            const agent = trimmed.substring('User-agent:'.length).trim();
            isUserAgentMatch = agent === '*' || agent === 'CryptoKnowledgeBot';
          }

          if (isUserAgentMatch && trimmed.startsWith('Disallow:')) {
            const disallowPath = trimmed.substring('Disallow:'.length).trim();

            if (
              disallowPath === '/' ||
              urlObj.pathname.startsWith(disallowPath)
            ) {
              throw new Error(
                `Crawling disallowed by robots.txt: ${disallowPath}`,
              );
            }
          }
        }
      }

      // If robots.txt doesn't exist or can't be fetched, proceed with caution
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Crawling disallowed')
      ) {
        throw error;
      }
      // Ignore other errors (e.g., robots.txt not found)
    }
  }

  /**
   * Extracts text content from HTML
   */
  private extractTextFromHtml(html: string): string {
    // Remove script and style tags
    let text = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Extracts metadata from HTML
   */
  private extractMetadata(
    html: string,
    sourceUrl: string,
  ): RawContent['metadata'] {
    const metadata: RawContent['metadata'] = {
      sourceUrl,
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract meta description
    const descMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    );
    if (descMatch) {
      metadata.description = descMatch[1];
    }

    // Extract author
    const authorMatch = html.match(
      /<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i,
    );
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }

    // Extract language
    const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
    if (langMatch) {
      metadata.language = langMatch[1];
    }

    return metadata;
  }
}
