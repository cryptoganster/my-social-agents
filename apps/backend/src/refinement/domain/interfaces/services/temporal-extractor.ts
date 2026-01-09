import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';

/**
 * ITemporalExtractor Interface
 *
 * Defines the contract for temporal information extraction from content.
 * Extracts dates, temporal windows, and resolves relative temporal references.
 *
 * Requirements: Refinement 4
 * Design: Domain Services section - TemporalAnalyzer
 */
export interface ITemporalExtractor {
  /**
   * Extracts temporal context from content
   *
   * @param content - The content to analyze
   * @param publishedAt - The publication date of the content
   * @returns Temporal context with event dates and windows
   */
  extract(content: string, publishedAt: Date): Promise<TemporalContext>;
}
