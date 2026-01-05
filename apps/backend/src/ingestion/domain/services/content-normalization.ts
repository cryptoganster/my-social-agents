import {
  SourceType,
  SourceTypeEnum,
  ContentMetadata,
  AssetTag,
} from '../value-objects';

/**
 * ContentNormalizationService
 *
 * Domain service for transforming raw content into normalized format.
 * Stateless service that handles content transformation, metadata extraction,
 * and cryptocurrency asset detection.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
export class ContentNormalizationService {
  /**
   * Common cryptocurrency symbols and their variations
   */
  private readonly CRYPTO_PATTERNS = new Map<string, RegExp>([
    ['BTC', /\b(bitcoin|btc)\b/gi],
    ['ETH', /\b(ethereum|eth)\b/gi],
    ['USDT', /\b(tether|usdt)\b/gi],
    ['BNB', /\b(binance\s*coin|bnb)\b/gi],
    ['SOL', /\b(solana|sol)\b/gi],
    ['XRP', /\b(ripple|xrp)\b/gi],
    ['ADA', /\b(cardano|ada)\b/gi],
    ['DOGE', /\b(dogecoin|doge)\b/gi],
    ['DOT', /\b(polkadot|dot)\b/gi],
    ['MATIC', /\b(polygon|matic)\b/gi],
    ['AVAX', /\b(avalanche|avax)\b/gi],
    ['LINK', /\b(chainlink|link)\b/gi],
    ['UNI', /\b(uniswap|uni)\b/gi],
    ['ATOM', /\b(cosmos|atom)\b/gi],
    ['LTC', /\b(litecoin|ltc)\b/gi],
  ]);

  /**
   * Normalizes raw content into a consistent format
   *
   * Performs the following transformations:
   * - Removes excessive whitespace
   * - Normalizes line endings
   * - Trims leading/trailing whitespace
   * - Removes control characters
   * - Normalizes Unicode characters
   *
   * Requirements: 2.1
   */
  normalize(rawContent: string, sourceType: SourceType): string {
    let normalized = rawContent;

    // Remove control characters except newlines and tabs
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize line endings to \n
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive whitespace (more than 2 consecutive spaces)
    normalized = normalized.replace(/ {3,}/g, '  ');

    // Remove excessive newlines (more than 2 consecutive)
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // Trim leading and trailing whitespace
    normalized = normalized.trim();

    // Source-specific normalization
    normalized = this.applySourceSpecificNormalization(normalized, sourceType);

    return normalized;
  }

  /**
   * Applies source-specific normalization rules
   */
  private applySourceSpecificNormalization(
    content: string,
    sourceType: SourceType,
  ): string {
    const type = sourceType.getValue();

    switch (type) {
      case SourceTypeEnum.WEB:
        // Remove HTML comments
        return content.replace(/<!--[\s\S]*?-->/g, '');

      case SourceTypeEnum.RSS:
        // Remove XML/HTML tags that might remain
        return content.replace(/<[^>]*>/g, '');

      case SourceTypeEnum.SOCIAL_MEDIA:
        // Normalize hashtags and mentions
        return content.replace(/#(\w+)/g, '#$1').replace(/@(\w+)/g, '@$1');

      case SourceTypeEnum.PDF:
      case SourceTypeEnum.OCR:
        // Remove common OCR artifacts
        return content
          .replace(/[|]/g, 'I') // Common OCR mistake
          .replace(/[`']/g, "'"); // Normalize quotes

      case SourceTypeEnum.WIKIPEDIA:
        // Remove MediaWiki markup remnants
        return content
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[link|text]] -> text
          .replace(/\[\[([^\]]+)\]\]/g, '$1'); // [[link]] -> link

      default:
        return content;
    }
  }

  /**
   * Extracts metadata from raw content
   *
   * Attempts to extract:
   * - Title (from first line or heading)
   * - Author (from common patterns)
   * - Published date (from date patterns)
   * - Language (basic detection)
   * - Source URL (if embedded)
   *
   * Requirements: 2.2
   */
  extractMetadata(rawContent: string, sourceType: SourceType): ContentMetadata {
    const title = this.extractTitle(rawContent, sourceType);
    const author = this.extractAuthor(rawContent);
    const publishedAt = this.extractPublishedDate(rawContent);
    const language = this.detectLanguage(rawContent);
    const sourceUrl = this.extractSourceUrl(rawContent);

    return ContentMetadata.create({
      title,
      author,
      publishedAt,
      language,
      sourceUrl,
    });
  }

  /**
   * Extracts title from content
   */
  private extractTitle(content: string, sourceType: SourceType): string | null {
    const type = sourceType.getValue();

    // Try to extract from first line (common for many formats)
    const firstLine = content.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 200) {
      return firstLine;
    }

    // Try to extract from heading patterns
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // For social media, use first sentence
    if (type === SourceTypeEnum.SOCIAL_MEDIA) {
      const firstSentence = content.match(/^([^.!?]+[.!?])/);
      if (firstSentence) {
        return firstSentence[1].trim();
      }
    }

    return null;
  }

  /**
   * Extracts author from content
   */
  private extractAuthor(content: string): string | null {
    // Common author patterns - match on word boundaries and stop at newlines
    const patterns = [
      /\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\n|$)/im,
      /\bauthor:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\n|$)/im,
      /\bwritten\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\n|$)/im,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extracts published date from content
   */
  private extractPublishedDate(content: string): Date | null {
    // Common date patterns
    const patterns = [
      // ISO format: 2024-01-15
      /(\d{4}-\d{2}-\d{2})/,
      // US format: January 15, 2024
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i,
      // Short format: Jan 15, 2024
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime()) && date <= new Date()) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Detects language from content (basic detection)
   */
  private detectLanguage(content: string): string | null {
    // Very basic language detection based on common words
    // In production, use a proper language detection library

    const englishWords = /\b(the|and|is|in|to|of|a|for|on|with)\b/gi;
    const englishMatches = content.match(englishWords);

    if (englishMatches !== null && englishMatches.length > 5) {
      return 'en';
    }

    // Default to null if uncertain
    return null;
  }

  /**
   * Extracts source URL from content
   */
  private extractSourceUrl(content: string): string | null {
    // Look for URLs in the content
    const urlPattern = /https?:\/\/[^\s<>"]+/i;
    const match = content.match(urlPattern);

    if (match) {
      try {
        new URL(match[0]); // Validate URL
        return match[0];
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Detects cryptocurrency asset mentions in content
   *
   * Returns AssetTag objects with confidence scores based on:
   * - Exact symbol matches (high confidence)
   * - Full name matches (medium confidence)
   * - Context around mentions (adjusts confidence)
   *
   * Requirements: 2.3
   */
  detectAssets(content: string): AssetTag[] {
    const detectedAssets = new Map<string, number>();

    // Check each crypto pattern
    for (const [symbol, pattern] of this.CRYPTO_PATTERNS.entries()) {
      const matches = content.match(pattern);

      if (matches) {
        const matchCount = matches.length;

        // Calculate confidence based on:
        // - Number of mentions (more = higher confidence)
        // - Type of match (symbol vs full name)
        let confidence = 0.5; // Base confidence

        // Increase confidence for multiple mentions
        if (matchCount >= 3) {
          confidence = 0.9;
        } else if (matchCount === 2) {
          confidence = 0.75;
        } else {
          confidence = 0.6;
        }

        // Check if it's a symbol match (higher confidence)
        const symbolPattern = new RegExp(`\\b${symbol}\\b`, 'gi');
        if (symbolPattern.test(content)) {
          confidence = Math.min(confidence + 0.1, 1.0);
        }

        // Store the highest confidence for this symbol
        const existingConfidence = detectedAssets.get(symbol) || 0;
        detectedAssets.set(symbol, Math.max(existingConfidence, confidence));
      }
    }

    // Convert to AssetTag objects
    return Array.from(detectedAssets.entries()).map(([symbol, confidence]) =>
      AssetTag.create({ symbol, confidence }),
    );
  }
}
