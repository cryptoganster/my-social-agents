import { Query } from '@nestjs/cqrs';
import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

/**
 * GetJobsByStatusQuery
 *
 * Query to retrieve ingestion jobs filtered by status with pagination support.
 * Returns a paginated list of read models optimized for API responses.
 *
 * Extends Query<GetJobsByStatusResult> for automatic type inference.
 *
 * Requirements: 6.3
 * Design: Queries - Job Queries
 */
export class GetJobsByStatusQuery extends Query<GetJobsByStatusResult> {
  constructor(
    public readonly status: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {
    super();
  }
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
