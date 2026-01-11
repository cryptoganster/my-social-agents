import { Command } from '@nestjs/cqrs';
import { ValidateContentQualityResult } from './result';

/**
 * ValidateContentQualityCommand
 *
 * Command to validate content quality.
 * Checks if content meets minimum requirements (length, metadata, language).
 *
 * Pipeline step 2: ContentNormalized → ValidateContentQualityCommand → ContentQualityValidated | ContentValidationFailed
 *
 * Requirements: 2.3, 3.1
 */
export class ValidateContentQualityCommand extends Command<ValidateContentQualityResult> {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly rawContent: string,
    public readonly normalizedContent: string,
    public readonly metadata: {
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly assetTags: string[],
    public readonly collectedAt: Date,
  ) {
    super();
  }
}
