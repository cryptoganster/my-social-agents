import { Query } from '@nestjs/cqrs';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * GetJobHistoryQuery
 *
 * Query to retrieve job execution history for a specific source.
 * Returns jobs ordered by executedAt DESC (most recent first).
 *
 * Extends Query<GetJobHistoryResult> for automatic type inference.
 *
 * Requirements: 6.4
 * Design: Queries - Job Queries
 */
export class GetJobHistoryQuery extends Query<GetJobHistoryResult> {
  constructor(
    public readonly sourceId: string,
    public readonly limit?: number,
  ) {
    super();
  }
}

/**
 * GetJobHistoryResult
 *
 * Result interface for GetJobHistoryQuery.
 * Returns job history with total count.
 */
export interface GetJobHistoryResult {
  jobs: IngestionJobReadModel[];
  total: number;
}
