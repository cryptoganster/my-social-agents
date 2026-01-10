import { Command } from '@nestjs/cqrs';
import { EnrichChunkResult } from './result';

/**
 * EnrichChunkCommand
 *
 * Command to enrich a single chunk with crypto entities, temporal context,
 * and quality score. This is the second step in the refinement pipeline.
 *
 * Extends Command<EnrichChunkResult> for automatic type inference.
 *
 * Requirements: Refinement 3, 4, 5
 * Design: Application Layer - Commands (Event-Driven Pipeline)
 */
export class EnrichChunkCommand extends Command<EnrichChunkResult> {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkId: string,
    public readonly chunkContent: string,
    public readonly chunkIndex: number,
    public readonly totalChunks: number,
    public readonly publishedAt: Date,
    public readonly qualityThreshold: number = 0.3,
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
    if (!this.chunkId || this.chunkId.trim().length === 0) {
      throw new Error('Chunk ID is required');
    }
    if (!this.chunkContent || this.chunkContent.trim().length === 0) {
      throw new Error('Chunk content is required');
    }
    if (this.chunkIndex < 0) {
      throw new Error('Chunk index must be non-negative');
    }
    if (this.totalChunks <= 0) {
      throw new Error('Total chunks must be positive');
    }
    if (this.qualityThreshold < 0 || this.qualityThreshold > 1) {
      throw new Error('Quality threshold must be between 0 and 1');
    }
  }
}
