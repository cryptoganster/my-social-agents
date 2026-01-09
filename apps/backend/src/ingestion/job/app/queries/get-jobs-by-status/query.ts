import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

/**
 * GetJobsByStatusQuery
 *
 * Query to retrieve ingestion jobs filtered by status with pagination support.
 * Returns a paginated list of read models optimized for API responses.
 *
 * Requirements: 6.3
 * Design: Queries - Job Queries
 */
export class GetJobsByStatusQuery {
  constructor(
    public readonly status: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

/**
 * GetJobsByStatusResult
 *
 * Result interface for GetJobsByStatusQuery.
 * Returns paginated job read models with total count.
 */
export interface GetJobsByStatusResult {
  jobs: IngestionJobReadModel[];
  total: number;
}
