import { Query } from '@nestjs/cqrs';
import { GetJobsByStatusResponse } from './response';

/**
 * GetJobsByStatusQuery
 *
 * Query to retrieve ingestion jobs filtered by status with pagination support.
 * Returns a paginated list of jobs optimized for API responses.
 *
 * Extends Query<GetJobsByStatusResponse> for automatic type inference.
 *
 * Requirements: 6.3
 * Design: Queries - Job Queries
 */
export class GetJobsByStatusQuery extends Query<GetJobsByStatusResponse> {
  constructor(
    public readonly status: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {
    super();
  }
}

// Re-export Response for convenience
export { GetJobsByStatusResponse } from './response';
