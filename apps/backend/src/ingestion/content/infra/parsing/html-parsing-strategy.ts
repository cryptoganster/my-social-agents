import { Injectable, Logger } from '@nestjs/common';
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';
import {
  IParsingStrategy,
  ParsingOptions,
  ExtractedMetadata,
} from '@/ingestion/content/domain/interfaces/services/parsing-strategy';

/**
 * HtmlParsingStrategy
 *
 * Converts HTML content to markdown using turndown library.
 * Extracts metadata from HTML meta tags and semantic elements.
 *
 * Technology: turndown + cheerio
 * - turndown: HTML to Markdown conversion with customizable rules
 * - cheerio: Fast HTML parsing for metadata extraction
 *
 * Requirements: 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@Injectable()
export class HtmlParsingStrategy implements IParsingStrategy {
  private readonly logger = new Logger(HtmlParsingStrategy.name);
  private readonly turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    this.configureTurndownRules();
  }

  parse(rawContent: string, options?: ParsingOptions): Promise<string> {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        return Promise.resolve('');
      }

      // Load HTML with cheerio for preprocessing
      const $ = cheerio.load(rawContent);

      // Remove unwanted elements
      this.removeUnwantedElements($, options?.removeSelectors);

      // Get cleaned HTML
      const cleanedHtml = $('body').html() || $.html();

      // Convert to markdown
      const markdown = this.turndown.turndown(cleanedHtml);

      // Clean up excessive whitespace
      return Promise.resolve(this.cleanMarkdown(markdown));
    } catch (error) {
      this.logger.error(
        `HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return Promise.resolve(''); // Return empty string on failure (graceful degradation)
    }
  }

  extractMetadata(rawContent: string): Promise<ExtractedMetadata> {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        return Promise.resolve({});
      }

      const $ = cheerio.load(rawContent);

      return Promise.resolve({
        title: this.extractTitle($),
        author: this.extractAuthor($),
        publishedAt: this.extractPublishedDate($),
        description: this.extractDescription($),
        links: this.extractLinks($),
        images: this.extractImages($),
      });
    } catch (error) {
      this.logger.warn(
        `Metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return Promise.resolve({});
    }
  }

  private configureTurndownRules(): void {
    // Preserve code blocks with language detection
    this.turndown.addRule('codeBlock', {
      filter: ['pre'],
      replacement: (content, node) => {
        // Use cheerio-compatible approach for code extraction
        const nodeHtml = node as unknown as { innerHTML?: string };
        const innerHTML = nodeHtml.innerHTML || content;

        // Try to extract language from class attribute
        const nodeWithClass = node as unknown as { className?: string };
        const className = nodeWithClass.className || '';
        const language =
          className.match(/language-(\w+)/)?.[1] ||
          className.match(/lang-(\w+)/)?.[1] ||
          '';

        return `\n\`\`\`${language}\n${innerHTML.trim()}\n\`\`\`\n`;
      },
    });

    // Remove script, style, nav, footer, aside tags
    this.turndown.remove([
      'script',
      'style',
      'nav',
      'footer',
      'aside',
      'noscript',
    ]);
  }

  private removeUnwantedElements(
    $: cheerio.CheerioAPI,
    customSelectors?: string[],
  ): void {
    const defaultSelectors = [
      'script',
      'style',
      'nav',
      'footer',
      'aside',
      'noscript',
      '.advertisement',
      '.ads',
      '.ad',
      '.sidebar',
      '.comments',
      '.comment-section',
      '.social-share',
      '.related-posts',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="complementary"]',
      '[aria-hidden="true"]',
    ];

    const allSelectors = [...defaultSelectors, ...(customSelectors || [])];
    allSelectors.forEach((selector) => $(selector).remove());
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text();

    return title?.trim() || undefined;
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').text() ||
      $('[itemprop="author"]').text() ||
      $('.author').first().text();

    return author?.trim() || undefined;
  }

  private extractPublishedDate($: cheerio.CheerioAPI): Date | undefined {
    const dateStr =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('[itemprop="datePublished"]').attr('content');

    if (dateStr) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content');

    return description?.trim() || undefined;
  }

  private extractLinks($: cheerio.CheerioAPI): string[] {
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        links.push(href);
      }
    });
    return [...new Set(links)]; // Remove duplicates
  }

  private extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        images.push(src);
      }
    });
    return [...new Set(images)]; // Remove duplicates
  }

  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/^\s+|\s+$/g, '') // Trim start and end
      .trim();
  }
}
