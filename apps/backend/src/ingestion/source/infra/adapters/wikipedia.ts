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
 * WikipediaAdapter
 *
 * Implements Wikipedia API integration with MediaWiki markup parsing.
 * Supports fetching articles by title or page ID.
 *
 * Requirements: 1.6
 */
@Injectable()
export class WikipediaAdapter implements SourceAdapter {
  /**
   * Collects content from Wikipedia articles
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const articleTitle = config.config.articleTitle as string;
    const articleId = config.config.articleId as string;
    const language = (config.config.language as string) || 'en';

    if (!articleTitle && !articleId) {
      throw new Error(
        'Wikipedia adapter requires either an articleTitle or articleId in configuration',
      );
    }

    try {
      const apiUrl = this.buildApiUrl(language);
      const article = await this.fetchArticle(apiUrl, articleTitle, articleId);

      return [article];
    } catch (error) {
      throw new Error(
        `Failed to fetch Wikipedia article: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.WIKIPEDIA;
  }

  /**
   * Validates Wikipedia configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate that either articleTitle or articleId is provided
    if (
      typeof config.articleTitle !== 'string' &&
      typeof config.articleId !== 'string'
    ) {
      errors.push('Either articleTitle or articleId is required');
    }

    // Validate articleTitle if provided
    if (
      config.articleTitle !== undefined &&
      typeof config.articleTitle !== 'string'
    ) {
      errors.push('articleTitle must be a string');
    }

    // Validate articleId if provided
    if (config.articleId !== undefined) {
      if (
        typeof config.articleId !== 'string' &&
        typeof config.articleId !== 'number'
      ) {
        errors.push('articleId must be a string or number');
      }
    }

    // Validate optional language
    if (config.language !== undefined && typeof config.language !== 'string') {
      errors.push('language must be a string (e.g., "en", "es", "fr")');
    }

    // Validate optional sections
    if (config.sections !== undefined && !Array.isArray(config.sections)) {
      errors.push('sections must be an array of section titles');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Builds Wikipedia API URL for the specified language
   */
  private buildApiUrl(language: string): string {
    return `https://${language}.wikipedia.org/w/api.php`;
  }

  /**
   * Fetches article from Wikipedia API
   */
  private async fetchArticle(
    apiUrl: string,
    title?: string,
    articleId?: string,
  ): Promise<RawContent> {
    // Build API request parameters
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'extracts|info|revisions',
      explaintext: 'true', // Get plain text instead of HTML
      exsectionformat: 'plain',
      inprop: 'url',
      rvprop: 'timestamp|user',
      rvslots: 'main',
    });

    if (title !== null && title !== undefined && title !== '') {
      params.append('titles', title);
    } else if (
      articleId !== null &&
      articleId !== undefined &&
      articleId !== ''
    ) {
      params.append('pageids', String(articleId));
    }

    const url = `${apiUrl}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CryptoKnowledgeBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    interface WikipediaPage {
      pageid?: number;
      title?: string;
      extract?: string;
      fullurl?: string;
      canonicalurl?: string;
      revisions?: Array<{
        timestamp?: string;
        user?: string;
      }>;
    }

    interface WikipediaResponse {
      query?: {
        pages?: Record<string, WikipediaPage>;
      };
    }

    const data = (await response.json()) as WikipediaResponse;

    // Extract page data
    const pages = data.query?.pages;
    if (!pages) {
      throw new Error('No pages found in Wikipedia API response');
    }

    const pageKey = Object.keys(pages)[0];
    const page = pages[pageKey];

    if (pageKey === '-1' || page === null || page === undefined) {
      throw new Error(
        `Wikipedia article not found: ${title ?? articleId ?? 'unknown'}`,
      );
    }

    // Extract content
    const content = page.extract ?? '';

    if (content === null || content === undefined || content.trim() === '') {
      throw new Error('Wikipedia article has no content');
    }

    // Extract metadata
    const metadata: RawContent['metadata'] = {
      title: page.title,
      sourceUrl: page.fullurl ?? page.canonicalurl,
      pageId: page.pageid,
    };

    // Extract revision information if available
    if (page.revisions !== undefined && page.revisions.length > 0) {
      const revision = page.revisions[0];

      if (
        revision.timestamp !== null &&
        revision.timestamp !== undefined &&
        revision.timestamp !== ''
      ) {
        metadata.publishedAt = new Date(revision.timestamp);
      }

      if (
        revision.user !== null &&
        revision.user !== undefined &&
        revision.user !== ''
      ) {
        metadata.author = revision.user;
      }
    }

    return {
      content: this.cleanWikiText(content),
      metadata,
    };
  }

  /**
   * Cleans Wikipedia text content
   */
  private cleanWikiText(text: string): string {
    // Remove MediaWiki markup that might remain
    let cleaned = text;

    // Remove reference markers like [1], [2], etc.
    cleaned = cleaned.replace(/\[\d+\]/g, '');

    // Remove section edit links
    cleaned = cleaned.replace(/\[edit\]/gi, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove multiple consecutive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
  }
}
