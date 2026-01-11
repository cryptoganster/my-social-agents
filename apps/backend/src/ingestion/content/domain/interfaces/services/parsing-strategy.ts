/**
 * ParsingOptions
 *
 * Configuration options for parsing strategies.
 */
export interface ParsingOptions {
  readonly preserveLinks?: boolean;
  readonly preserveImages?: boolean;
  readonly codeBlockStyle?: 'fenced' | 'indented';
  readonly headingStyle?: 'atx' | 'setext';
  readonly removeSelectors?: string[];
  readonly url?: string; // URL for Firecrawl fallback
}

/**
 * ExtractedMetadata
 *
 * Metadata extracted during content parsing.
 */
export interface ExtractedMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly publishedAt?: Date;
  readonly links?: string[];
  readonly images?: string[];
  readonly description?: string;
}

/**
 * IParsingStrategy Interface
 *
 * Low-level strategy for converting specific content formats to markdown.
 * Each implementation handles a specific source format (HTML, RSS, etc.).
 *
 * Implementations:
 * - HtmlParsingStrategy: Converts HTML to markdown using turndown
 * - RssParsingStrategy: Parses RSS/Atom feeds using rss-parser
 *
 * Requirements: 3.1, 3.2
 */
export interface IParsingStrategy {
  /**
   * Parses raw content into markdown
   *
   * @param rawContent - Raw content in source format (HTML, XML, etc.)
   * @param options - Parsing configuration options
   * @returns Markdown string
   */
  parse(rawContent: string, options?: ParsingOptions): Promise<string>;

  /**
   * Extracts metadata from raw content
   *
   * @param rawContent - Raw content in source format
   * @returns Extracted metadata (title, author, links, etc.)
   */
  extractMetadata(rawContent: string): Promise<ExtractedMetadata>;
}
