import { SourceConfiguration } from '@/ingestion/source/domain/aggregates/source-configuration';
import { SourceType } from '@/ingestion/source/domain/value-objects/source-type';

/**
 * RawContent
 *
 * Represents raw content collected from a source before normalization.
 * Contains the raw text and optional metadata extracted by the adapter.
 */
export interface RawContent {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    publishedAt?: Date;
    language?: string;
    sourceUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * AdapterValidationResult
 *
 * Result of adapter configuration validation.
 */
export interface AdapterValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * SourceAdapter Interface
 *
 * Pluggable interface for source-specific collection logic.
 * Each source type (web, RSS, social media, etc.) implements this interface.
 *
 * Requirements: 1.7, 8.1
 */
export interface SourceAdapter {
  /**
   * Collects content from the configured source
   * Returns an array of raw content items
   * Throws an error if collection fails
   */
  collect(config: SourceConfiguration): Promise<RawContent[]>;

  /**
   * Checks if this adapter supports a given source type
   * Used for adapter discovery and registration
   */
  supports(sourceType: SourceType): boolean;

  /**
   * Validates source-specific configuration
   * Returns validation result with any errors
   */
  validateConfig(config: Record<string, unknown>): AdapterValidationResult;
}
