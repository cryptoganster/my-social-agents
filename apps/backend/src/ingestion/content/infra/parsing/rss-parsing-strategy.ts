import { Injectable, Inject, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import {
  IParsingStrategy,
  ParsingOptions,
  ExtractedMetadata,
} from '@/ingestion/content/domain/interfaces/services/parsing-strategy';

type CustomFeed = {
  title?: string;
  description?: string;
  link?: string;
  image?: { url?: string };
  creator?: string;
};

type CustomItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  contentEncoded?: string;
  dcCreator?: string;
  description?: string;
  enclosure?: { url?: string; type?: string };
};

/**
 * RssParsingStrategy
 *
 * Parses RSS/Atom feeds and converts content to markdown.
 * Uses rss-parser for feed parsing and delegates HTML conversion to HtmlParsingStrategy.
 *
 * Technology: rss-parser
 * - Supports RSS 2.0, RSS 1.0, and Atom feeds
 * - Handles various feed quirks and edge cases
 *
 * Requirements: 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
@Injectable()
export class RssParsingStrategy implements IParsingStrategy {
  private readonly logger = new Logger(RssParsingStrategy.name);
  private readonly parser: Parser<CustomFeed, CustomItem>;

  constructor(
    @Inject('IHtmlParsingStrategy')
    private readonly htmlStrategy: IParsingStrategy,
  ) {
    this.parser = new Parser({
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'dcCreator'],
        ],
      },
    });
  }

  async parse(rawContent: string, options?: ParsingOptions): Promise<string> {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        return '';
      }

      const feed = await this.parser.parseString(rawContent);

      // Build markdown from feed items
      const markdownParts: string[] = [];

      // Add feed title as header
      if (feed.title) {
        markdownParts.push(`# ${feed.title}\n`);
      }

      // Process each item
      for (const item of feed.items || []) {
        const itemMarkdown = await this.parseItem(item, options);
        if (itemMarkdown.trim()) {
          markdownParts.push(itemMarkdown);
        }
      }

      return markdownParts.join('\n---\n\n');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`RSS parsing failed: ${errorMessage}`);
      throw new Error(`Failed to parse RSS feed: ${errorMessage}`);
    }
  }

  async extractMetadata(rawContent: string): Promise<ExtractedMetadata> {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        return {};
      }

      const feed = await this.parser.parseString(rawContent);
      const firstItem = feed.items?.[0];

      return {
        title: firstItem?.title || feed.title,
        author: firstItem?.creator || firstItem?.dcCreator || feed.creator,
        publishedAt: firstItem?.pubDate
          ? new Date(firstItem.pubDate)
          : undefined,
        description: firstItem?.contentSnippet || feed.description,
        links: this.extractLinksFromFeed(feed),
        images: this.extractImagesFromFeed(feed),
      };
    } catch (error) {
      this.logger.warn(
        `RSS metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {};
    }
  }

  private async parseItem(
    item: CustomItem,
    options?: ParsingOptions,
  ): Promise<string> {
    const parts: string[] = [];

    // Item title
    if (item.title) {
      parts.push(`## ${item.title}\n`);
    }

    // Item metadata
    const metaParts: string[] = [];
    if (item.creator || item.dcCreator) {
      metaParts.push(`**Author:** ${item.creator || item.dcCreator}`);
    }
    if (item.pubDate) {
      metaParts.push(`**Published:** ${new Date(item.pubDate).toISOString()}`);
    }
    if (metaParts.length > 0) {
      parts.push(metaParts.join(' | ') + '\n');
    }

    // Item content (prefer content:encoded over description)
    const htmlContent =
      item.contentEncoded || item.content || item.description || '';
    if (htmlContent) {
      const markdown = await this.htmlStrategy.parse(htmlContent, options);
      if (markdown.trim()) {
        parts.push(markdown);
      }
    }

    // Item link
    if (item.link) {
      parts.push(`\n[Read more](${item.link})`);
    }

    return parts.join('\n');
  }

  private extractLinksFromFeed(feed: {
    link?: string;
    items?: CustomItem[];
  }): string[] {
    const links: string[] = [];
    if (feed.link) links.push(feed.link);
    for (const item of feed.items || []) {
      if (item.link) links.push(item.link);
    }
    return [...new Set(links)];
  }

  private extractImagesFromFeed(feed: {
    image?: { url?: string };
    items?: CustomItem[];
  }): string[] {
    const images: string[] = [];
    if (feed.image?.url) images.push(feed.image.url);
    for (const item of feed.items || []) {
      if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
        images.push(item.enclosure.url);
      }
    }
    return [...new Set(images)];
  }
}
