import { Command } from '@nestjs/cqrs';
import { FinalizeRefinementResult } from './result';

/**
 * FinalizeRefinementCommand
 *
 * Command to finalize the refinement process after all chunks have been processed.
 * This is the final step in the refinement pipeline.
 *
 * Extends Command<FinalizeRefinementResult> for automatic type inference.
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Commands (Event-Driven Pipeline)
 */
export class FinalizeRefinementCommand extends Command<FinalizeRefinementResult> {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly totalChunks: number,
    public readonly validChunks: number,
  ) {
    super();
    this.validate();
  }

  private validate(): void {
    if (!this.refinementId || this.refinementId.trim().length === 0) {
      throw new Error('Refinement ID is required');
    }
    if (!this.contentItemId || this.contentItemId.trim().length === 0) {
      throw new Error('Content item ID is required');
    }
    if (this.totalChunks < 0) {
      throw new Error('Total chunks must be non-negative');
    }
    if (this.validChunks < 0) {
      throw new Error('Valid chunks must be non-negative');
    }
  }
}
