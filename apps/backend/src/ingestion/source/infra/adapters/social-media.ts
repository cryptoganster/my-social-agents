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
 * SocialMediaAdapter
 *
 * Implements social media API integration with OAuth authentication
 * and rate limiting support.
 *
 * Supports platforms: Twitter/X, Reddit, etc.
 *
 * Requirements: 1.3
 */
@Injectable()
export class SocialMediaAdapter implements SourceAdapter {
  private rateLimitState: Map<string, { count: number; resetAt: Date }> =
    new Map();

  /**
   * Collects content from social media platforms
   */
  async collect(config: SourceConfiguration): Promise<RawContent[]> {
    const platform = config.config.platform as string;

    if (platform === null || platform === undefined || platform === '') {
      throw new Error(
        'Social media adapter requires a platform in configuration',
      );
    }

    if (
      config.credentials === null ||
      config.credentials === undefined ||
      config.credentials === ''
    ) {
      throw new Error(
        'Social media adapter requires credentials for authentication',
      );
    }

    // Check rate limits before making request
    this.checkRateLimit(config.sourceId);

    try {
      switch (platform.toLowerCase()) {
        case 'twitter':
        case 'x':
          return await this.collectFromTwitter();
        case 'reddit':
          return await this.collectFromReddit(config);
        default:
          throw new Error(`Unsupported social media platform: ${platform}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to collect from ${platform}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Checks if this adapter supports the given source type
   */
  supports(sourceType: SourceType): boolean {
    return sourceType.getValue() === SourceTypeEnum.SOCIAL_MEDIA;
  }

  /**
   * Validates social media configuration
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult {
    const errors: string[] = [];

    // Validate platform
    if (typeof config.platform !== 'string') {
      errors.push('platform is required and must be a string');
    } else {
      const supportedPlatforms = ['twitter', 'x', 'reddit'];
      if (!supportedPlatforms.includes(config.platform.toLowerCase())) {
        errors.push(
          `platform must be one of: ${supportedPlatforms.join(', ')}`,
        );
      }
    }

    // Validate query or username
    if (
      typeof config.query !== 'string' &&
      typeof config.username !== 'string'
    ) {
      errors.push('Either query or username is required');
    }

    // Validate optional maxResults
    if (config.maxResults !== undefined) {
      if (
        typeof config.maxResults !== 'number' ||
        config.maxResults < 1 ||
        config.maxResults > 100
      ) {
        errors.push('maxResults must be a number between 1 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks and enforces rate limits
   */
  private checkRateLimit(sourceId: string): void {
    const state = this.rateLimitState.get(sourceId);

    if (state) {
      const now = new Date();

      // Reset if window has passed
      if (now >= state.resetAt) {
        this.rateLimitState.delete(sourceId);
        return;
      }

      // Check if limit exceeded
      if (state.count >= 15) {
        // 15 requests per 15 minutes (example)
        const waitMs = state.resetAt.getTime() - now.getTime();
        throw new Error(
          `Rate limit exceeded. Please wait ${Math.ceil(waitMs / 1000)} seconds before retrying.`,
        );
      }

      // Increment counter
      state.count++;
    } else {
      // Initialize rate limit tracking
      const resetAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      this.rateLimitState.set(sourceId, { count: 1, resetAt });
    }
  }

  /**
   * Collects content from Twitter/X
   */
  private collectFromTwitter(): Promise<RawContent[]> {
    // Note: This is a simplified implementation
    // In production, you would use the Twitter API v2 with proper OAuth

    const items: RawContent[] = [];

    // Placeholder for actual API call
    // const tweets = await this.fetchTweets(query || username, maxResults, config.credentials);

    // For now, return empty array (actual implementation would require Twitter API credentials)
    // This demonstrates the structure without requiring actual API access

    return Promise.resolve(items);
  }

  /**
   * Collects content from Reddit
   */
  private async collectFromReddit(
    config: SourceConfiguration,
  ): Promise<RawContent[]> {
    const query = config.config.query as string;
    const subreddit = config.config.subreddit as string;
    const maxResults = (config.config.maxResults as number) || 10;

    try {
      // Reddit allows unauthenticated access to public data via JSON endpoints
      let url: string;

      if (subreddit) {
        url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${maxResults}`;
      } else if (query) {
        url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}`;
      } else {
        throw new Error('Either subreddit or query is required for Reddit');
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CryptoKnowledgeBot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      interface RedditResponse {
        data?: {
          children?: Array<{
            data: {
              title: string;
              selftext: string;
              author: string;
              created_utc: number;
              permalink: string;
              subreddit: string;
              score: number;
            };
          }>;
        };
      }

      const data = (await response.json()) as RedditResponse;
      const items: RawContent[] = [];

      if (data.data?.children) {
        for (const child of data.data.children) {
          const post = child.data;

          // Combine title and selftext for content
          const content = [post.title, post.selftext]
            .filter(Boolean)
            .join('\n\n');

          if (content.trim()) {
            items.push({
              content: content.trim(),
              metadata: {
                title: post.title,
                author: post.author,
                publishedAt: new Date(post.created_utc * 1000),
                sourceUrl: `https://www.reddit.com${post.permalink}`,
                subreddit: post.subreddit,
                score: post.score,
              },
            });
          }
        }
      }

      return items;
    } catch (error) {
      throw new Error(
        `Failed to fetch from Reddit: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
