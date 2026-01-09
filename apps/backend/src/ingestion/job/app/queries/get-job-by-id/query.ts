import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

/**
 * GetJobByIdQuery
 *
 * Query to retrieve a single ingestion job by its ID.
 * Returns a read model optimized for API responses.
 *
 * Requirements: 6.1, 6.2
 * Design: Queries - Job Queries
 */
export class GetJobByIdQuery {
  constructor(public readonly jobId: string) {}
}

/**
 * GetJobByIdResult
 *
 * Result interface for GetJobByIdQuery.
 * Returns the complete job read model or null if not found.
 */
export type GetJobByIdResult = IngestionJobReadModel | null;
