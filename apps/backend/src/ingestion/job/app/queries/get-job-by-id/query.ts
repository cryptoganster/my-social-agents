import { Query } from '@nestjs/cqrs';
import { IngestionJobReadModel } from '@/ingestion/job/app/queries/read-models/ingestion-job';

/**
 * GetJobByIdQuery
 *
 * Query to retrieve a single ingestion job by its ID.
 * Returns a read model optimized for API responses.
 *
 * Extends Query<TResult> for automatic type inference when using QueryBus.
 *
 * Requirements: 6.1, 6.2
 * Design: Queries - Job Queries
 */
export class GetJobByIdQuery extends Query<IngestionJobReadModel | null> {
  constructor(public readonly jobId: string) {
    super();
  }
}

/**
 * GetJobByIdResult
 *
 * Result type alias for GetJobByIdQuery.
 * Returns the complete job read model or null if not found.
 */
export type GetJobByIdResult = IngestionJobReadModel | null;
