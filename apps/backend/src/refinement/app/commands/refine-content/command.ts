import { RefinementConfig } from '@refinement/domain/value-objects/refinement-config';

/**
 * RefineContentCommand
 *
 * Command to refine ingested content into semantically coherent chunks
 * with crypto-specific metadata enrichment.
 *
 * This command represents the intent to:
 * - Split content into semantic chunks
 * - Extract crypto entities (tokens, exchanges, blockchains, protocols, events)
 * - Analyze temporal context
 * - Validate content quality
 * - Generate structured metadata
 *
 * Requirements: Refinement 1, 2, 3, 4, 5, 7
 * Design: Application Layer - Commands
 */
export class RefineContentCommand {
  constructor(
    public readonly contentItemId: string,
    public readonly config?: RefinementConfig,
  ) {
    this.validate();
  }

  /**
   * Validates command properties
   */
  private validate(): void {
    if (!this.contentItemId || this.contentItemId.trim().length === 0) {
      throw new Error('Content item ID is required');
    }

    // Config validation is handled by the RefinementConfig Value Object itself
    // No need to validate here - if config is provided, it's already valid
  }
}
