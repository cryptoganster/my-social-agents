import { Query } from '@nestjs/cqrs';
import { ContentItemReadModel } from '@/ingestion/content/app/queries/read-models/content-item';

/**
 * GetContentByHashQuery
 *
 * Query to retrieve content by its hash value.
 * Used for duplicate detection during content ingestion.
 *
 * Extends Query<GetContentByHashResult> for automatic type inference.
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2
 * Design: Queries - Content Queries
 */
export class GetContentByHashQuery extends Query<GetContentByHashResult> {
  constructor(public readonly contentHash: string) {
    super();
  }
}

/**
 * GetContentByHashResult
 *
 * Result type for GetContentByHashQuery.
 * Returns a read model or null if content not found.
 */
export type GetContentByHashResult = ContentItemReadModel | null;
