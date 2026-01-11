import { Command } from '@nestjs/cqrs';
import { SaveContentItemResult } from './result';

/**
 * SaveContentItemCommand
 *
 * Command to persist a content item to the database.
 * Creates the ContentItem aggregate and saves it.
 *
 * Pipeline step 4: ContentDeduplicationChecked (isDuplicate: false) → SaveContentItemCommand → ContentIngested
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export class SaveContentItemCommand extends Command<SaveContentItemResult> {
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
    public readonly contentHash: string,
    public readonly collectedAt: Date,
  ) {
    super();
  }
}
