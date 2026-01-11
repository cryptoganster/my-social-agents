/**
 * Firecrawl Configuration
 *
 * Configuration interface for Firecrawl integration.
 * Firecrawl is used as a fallback parsing strategy for JavaScript-heavy websites.
 *
 * Environment Variables:
 * - FIRECRAWL_ENABLED: Enable/disable Firecrawl integration (default: true)
 * - FIRECRAWL_API_URL: Firecrawl API URL (default: http://localhost:3002)
 * - FIRECRAWL_API_KEY: Optional API key for cloud Firecrawl
 * - FIRECRAWL_TIMEOUT: Request timeout in milliseconds (default: 30000)
 * - FIRECRAWL_MAX_RETRIES: Maximum retry attempts (default: 3)
 * - FIRECRAWL_FALLBACK_ENABLED: Enable fallback to Firecrawl (default: true)
 *
 * Requirements: 6.1
 */

export interface FirecrawlConfig {
  /**
   * Enable/disable Firecrawl integration
   * When false, Firecrawl will not be used even if configured
   */
  enabled: boolean;

  /**
   * Firecrawl API base URL
   * For local development: http://localhost:3002
   * For Docker: http://firecrawl-api:3002
   */
  apiUrl: string;

  /**
   * Optional API key for cloud Firecrawl
   * Not required for self-hosted instances
   */
  apiKey?: string;

  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout: number;

  /**
   * Maximum number of retry attempts for failed requests
   * Default: 3
   */
  maxRetries: number;

  /**
   * Enable/disable fallback to Firecrawl for JS-heavy sites
   * When false, Firecrawl will not be used as a fallback
   */
  fallbackEnabled: boolean;
}

/**
 * Load Firecrawl configuration from environment variables
 *
 * @param configService - NestJS ConfigService
 * @returns FirecrawlConfig
 */
export function loadFirecrawlConfig(configService: {
  get: <T>(key: string, defaultValue?: T) => T;
}): FirecrawlConfig {
  return {
    enabled: configService.get<boolean>('FIRECRAWL_ENABLED', true),
    apiUrl: configService.get<string>(
      'FIRECRAWL_API_URL',
      'http://localhost:3002',
    ),
    apiKey: configService.get<string>('FIRECRAWL_API_KEY', undefined),
    timeout: configService.get<number>('FIRECRAWL_TIMEOUT', 30000),
    maxRetries: configService.get<number>('FIRECRAWL_MAX_RETRIES', 3),
    fallbackEnabled: configService.get<boolean>(
      'FIRECRAWL_FALLBACK_ENABLED',
      true,
    ),
  };
}

/**
 * Validate Firecrawl configuration
 *
 * @param config - FirecrawlConfig to validate
 * @throws Error if configuration is invalid
 */
export function validateFirecrawlConfig(config: FirecrawlConfig): void {
  if (config.enabled) {
    if (!config.apiUrl) {
      throw new Error(
        'FIRECRAWL_API_URL is required when Firecrawl is enabled',
      );
    }

    if (
      !config.apiUrl.startsWith('http://') &&
      !config.apiUrl.startsWith('https://')
    ) {
      throw new Error('FIRECRAWL_API_URL must start with http:// or https://');
    }

    if (config.timeout <= 0) {
      throw new Error('FIRECRAWL_TIMEOUT must be greater than 0');
    }

    if (config.maxRetries < 0) {
      throw new Error(
        'FIRECRAWL_MAX_RETRIES must be greater than or equal to 0',
      );
    }
  }
}
