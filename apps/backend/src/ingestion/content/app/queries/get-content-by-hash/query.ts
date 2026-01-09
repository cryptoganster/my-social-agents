import { ContentItemReadModel } from '@/ingestion/content/domain/read-models/content-item';

/**
 * GetContentByHashQuery
 *
 * Query to retrieve content by its hash value.
 * Used for duplicate detection during content ingestion.
 *
 * Requirements: 2.1, 2.2, 3.1, 3.2
 * Design: Queries - Content Queries
 */
export class GetContentByHashQuery {
  constructor(public readonly contentHash: string) {}
}

/**
 * GetContentByHashResult
 *
 * Result interface for GetContentByHashQuery.
 * Returns a read model or null if content not found.
 */
export type GetContentByHashResult = ContentItemReadModel | null;
