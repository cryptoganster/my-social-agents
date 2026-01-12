import { Query } from '@nestjs/cqrs';
import { GetJobByIdResponse } from './response';

/**
 * GetJobByIdQuery
 *
 * Query to retrieve a single ingestion job by its ID.
 * Returns a response optimized for API consumption.
 *
 * Extends Query<TResult> for automatic type inference when using QueryBus.
 *
 * Requirements: 6.1, 6.2
 * Design: Queries - Job Queries
 */
export class GetJobByIdQuery extends Query<GetJobByIdResponse | null> {
  constructor(public readonly jobId: string) {
    super();
  }
}

// Re-export Response for convenience
export { GetJobByIdResponse } from './response';
