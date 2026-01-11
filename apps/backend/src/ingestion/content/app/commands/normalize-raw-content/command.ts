import { Command } from '@nestjs/cqrs';
import { NormalizeRawContentResult } from './result';

/**
 * NormalizeRawContentCommand
 *
 * Command to normalize raw content from a source.
 * Transforms raw content into a clean, standardized format.
 *
 * Pipeline step 1: ContentCollected → NormalizeRawContentCommand → ContentNormalized
 *
 * Requirements: 2.1, 2.2
 */
export class NormalizeRawContentCommand extends Command<NormalizeRawContentResult> {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly rawContent: string,
    public readonly sourceType: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly collectedAt: Date,
  ) {
    super();
  }
}
