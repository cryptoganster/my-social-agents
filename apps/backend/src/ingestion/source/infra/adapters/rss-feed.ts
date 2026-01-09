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
 * RssFeedAdapter
 *
 * Implements RSS/Atom feed parsing and normalization.
 * Supports both RSS 2.0 and Atom feed formats.
 *
 * Requirements: 1.2
 */
@Injectable()
export class RssFeedAdapter implements SourceAdapter {
  /**
   * Collects content from RSS/Atom feeds
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const feedUrl = config.config.feedUrl as string;

    if (!feedUrl) {
      throw new Error('RSS adapter requires a feedUrl in configuration');
    }

    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'CryptoKnowledgeBot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();

      // Detect feed type and parse accordingly
      const items = this.isAtomFeed(xml)
        ? this.parseAtomFeed(xml)
        : this.parseRssFeed(xml);

      return items;
    } catch (error) {
      throw new Error(
        `Failed to fetch RSS feed ${feedUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.RSS;
  }

  /**
   * Validates RSS feed configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate feedUrl
    if (typeof config.feedUrl !== 'string') {
      errors.push('feedUrl is required and must be a string');
    } else {
      try {
        new URL(config.feedUrl);
      } catch {
        errors.push('feedUrl must be a valid URL');
      }
    }

    // Validate optional maxItems
    if (config.maxItems !== undefined) {
      if (typeof config.maxItems !== 'number' || config.maxItems < 1) {
        errors.push('maxItems must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detects if the feed is Atom format
   */
  private isAtomFeed(xml: string): boolean {
    return (
      xml.includes('<feed') &&
      xml.includes('xmlns="http://www.w3.org/2005/Atom"')
    );
  }

  /**
   * Parses RSS 2.0 feed
   */
  private parseRssFeed(xml: string): RawContent[] {
    const items: RawContent[] = [];

    // Extract all <item> elements
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title');
      const description = this.extractTag(itemXml, 'description');
      const contentEncoded = this.extractTag(itemXml, 'content:encoded');
      const content =
        contentEncoded !== null &&
        contentEncoded !== undefined &&
        contentEncoded !== ''
          ? contentEncoded
          : description;
      const link = this.extractTag(itemXml, 'link');
      const authorTag = this.extractTag(itemXml, 'author');
      const dcCreator = this.extractTag(itemXml, 'dc:creator');
      const author =
        authorTag !== null && authorTag !== undefined && authorTag !== ''
          ? authorTag
          : dcCreator;
      const pubDate = this.extractTag(itemXml, 'pubDate');

      if (content !== null && content !== undefined && content !== '') {
        items.push({
          content: this.cleanHtml(content),
          metadata: {
            title:
              title !== null && title !== undefined && title !== ''
                ? title
                : undefined,
            author:
              author !== null && author !== undefined && author !== ''
                ? author
                : undefined,
            publishedAt:
              pubDate !== null && pubDate !== undefined && pubDate !== ''
                ? this.parseDate(pubDate)
                : undefined,
            sourceUrl:
              link !== null && link !== undefined && link !== ''
                ? link
                : undefined,
          },
        });
      }
    }

    return items;
  }

  /**
   * Parses Atom feed
   */
  private parseAtomFeed(xml: string): RawContent[] {
    const items: RawContent[] = [];

    // Extract all <entry> elements
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];

      const title = this.extractTag(entryXml, 'title');
      const summary = this.extractTag(entryXml, 'summary');
      const contentTag = this.extractTag(entryXml, 'content');
      const content =
        contentTag !== null && contentTag !== undefined && contentTag !== ''
          ? contentTag
          : summary;
      const link = this.extractAtomLink(entryXml);
      const author = this.extractAtomAuthor(entryXml);
      const publishedTag = this.extractTag(entryXml, 'published');
      const updatedTag = this.extractTag(entryXml, 'updated');
      const published =
        publishedTag !== null &&
        publishedTag !== undefined &&
        publishedTag !== ''
          ? publishedTag
          : updatedTag;

      if (content !== null && content !== undefined && content !== '') {
        items.push({
          content: this.cleanHtml(content),
          metadata: {
            title:
              title !== null && title !== undefined && title !== ''
                ? title
                : undefined,
            author:
              author !== null && author !== undefined && author !== ''
                ? author
                : undefined,
            publishedAt:
              published !== null && published !== undefined && published !== ''
                ? this.parseDate(published)
                : undefined,
            sourceUrl:
              link !== null && link !== undefined && link !== ''
                ? link
                : undefined,
          },
        });
      }
    }

    return items;
  }

  /**
   * Extracts content from an XML tag
   */
  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(
      `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
      'i',
    );
    const match = xml.match(regex);

    if (match) {
      let content = match[1].trim();

      // Remove CDATA sections
      content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

      return this.decodeXmlEntities(content);
    }

    return null;
  }

  /**
   * Extracts link from Atom entry
   */
  private extractAtomLink(xml: string): string | null {
    const linkMatch = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
    return linkMatch ? linkMatch[1] : null;
  }

  /**
   * Extracts author from Atom entry
   */
  private extractAtomAuthor(xml: string): string | null {
    const authorMatch = xml.match(/<author>([\s\S]*?)<\/author>/i);
    if (authorMatch) {
      const nameMatch = authorMatch[1].match(/<name>([^<]+)<\/name>/i);
      return nameMatch ? nameMatch[1].trim() : null;
    }
    return null;
  }

  /**
   * Cleans HTML content
   */
  private cleanHtml(html: string): string {
    // Remove CDATA sections
    let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

    // Remove script and style tags
    text = text.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = this.decodeXmlEntities(text);

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Decodes XML/HTML entities
   */
  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }

  /**
   * Parses date string to Date object
   */
  private parseDate(dateStr: string): Date | undefined {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }
}
