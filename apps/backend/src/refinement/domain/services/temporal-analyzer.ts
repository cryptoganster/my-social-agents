import { TemporalContext } from '@refinement/domain/value-objects/temporal-context';
import { ITemporalExtractor } from '@refinement/domain/interfaces/services/temporal-extractor';

/**
 * TemporalAnalyzer Domain Service
 *
 * Analyzes content to extract temporal information:
 * - Publication date
 * - Event dates
 * - Temporal windows
 * - Relative date resolution
 *
 * Requirements: Refinement 4
 * Design: Domain Services section - TemporalAnalyzer
 */
export class TemporalAnalyzer {
  constructor(private readonly extractor: ITemporalExtractor) {}

  /**
   * Analyzes content and extracts temporal context
   *
   * @param content - The content to analyze
   * @param publishedAt - The publication date of the content
   * @returns Temporal context with dates and windows
   */
  async analyze(content: string, publishedAt: Date): Promise<TemporalContext> {
    // Delegate to the temporal extractor implementation
    // The extractor handles:
    // - Extracting all date references
    // - Identifying primary event date
    // - Detecting temporal windows
    // - Resolving relative dates
    return await this.extractor.extract(content, publishedAt);
  }
}
