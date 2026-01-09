import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

/**
 * GetJobHistoryQuery
 *
 * Query to retrieve job execution history for a specific source.
 * Returns jobs ordered by executedAt DESC (most recent first).
 *
 * Requirements: 6.4
 * Design: Queries - Job Queries
 */
export class GetJobHistoryQuery {
  constructor(
    public readonly sourceId: string,
    public readonly limit?: number,
  ) {}
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
