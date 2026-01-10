import { Command } from '@nestjs/cqrs';
import { ChunkContentResult } from './result';

/**
 * ChunkContentCommand
 *
 * Command to chunk content into semantic fragments.
 * This is the first step in the refinement pipeline after
 * the refinement aggregate has been created and started.
 *
 * Extends Command<ChunkContentResult> for automatic type inference.
 *
 * Requirements: Refinement 2
 * Design: Application Layer - Commands (Event-Driven Pipeline)
 */
export class ChunkContentCommand extends Command<ChunkContentResult> {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkSize: number = 800,
    public readonly chunkOverlap: number = 150,
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
    if (this.chunkSize < 500 || this.chunkSize > 1000) {
      throw new Error('Chunk size must be between 500 and 1000');
    }
    if (this.chunkOverlap < 100 || this.chunkOverlap > 200) {
      throw new Error('Chunk overlap must be between 100 and 200');
    }
  }
}
