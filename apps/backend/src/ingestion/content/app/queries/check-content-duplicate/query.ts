import { Query } from '@nestjs/cqrs';
import { DuplicateCheckReadModel } from '../read-models/duplicate-check';

/**
 * CheckContentDuplicateQuery
 *
 * Query to check if content already exists in the system.
 * Uses content hash to detect duplicates.
 *
 * Pipeline step 3: ContentQualityValidated → CheckContentDuplicateQuery → ContentDeduplicationChecked
 *
 * Requirements: 3.2, 3.3
 */
export class CheckContentDuplicateQuery extends Query<DuplicateCheckReadModel> {
  constructor(public readonly normalizedContent: string) {
    super();
  }
}
