import { RefinementConfig } from '@refinement/domain/value-objects/refinement-config';

/**
 * RerefineContentCommand
 *
 * Command to re-refine previously refined content with a new refinement process.
 * This is used when content needs to be reprocessed due to:
 * - Quality issues discovered after initial refinement
 * - Updated extraction algorithms
 * - Manual review requiring reprocessing
 * - Configuration changes (chunk size, quality threshold, etc.)
 *
 * The command includes a reason to track why reprocessing was requested.
 *
 * Requirements: Refinement 11
 * Design: Application Layer - Commands
 */
export class RerefineContentCommand {
  /**
   * Creates a new RerefineContentCommand
   *
   * @param contentItemId - ID of the content item to re-refine
   * @param reason - Reason for re-refinement (e.g., "Low quality detected", "Algorithm update")
   * @param config - Optional refinement configuration overrides
   */
  constructor(
    public readonly contentItemId: string,
    public readonly reason: string,
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

    if (!this.reason || this.reason.trim().length === 0) {
      throw new Error('Reason is required');
    }

    if (this.reason.length > 500) {
      throw new Error('Reason must be 500 characters or less');
    }

    // Config validation is handled by the RefinementConfig Value Object itself
    // No need to validate here - if config is provided, it's already valid
  }
}
