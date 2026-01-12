import { Query } from '@nestjs/cqrs';
import { GetJobHistoryResponse } from './response';

/**
 * GetJobHistoryQuery
 *
 * Query to retrieve job execution history for a specific source.
 * Returns jobs ordered by executedAt DESC (most recent first).
 *
 * Extends Query<GetJobHistoryResponse> for automatic type inference.
 *
 * Requirements: 6.4
 * Design: Queries - Job Queries
 */
export class GetJobHistoryQuery extends Query<GetJobHistoryResponse> {
  constructor(
    public readonly sourceId: string,
    public readonly limit?: number,
  ) {
    super();
  }
}

// Re-export Response for convenience
export { GetJobHistoryResponse } from './response';
