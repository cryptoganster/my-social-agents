import { IngestionJobReadModel } from '@/ingestion/job/domain/read-models/ingestion-job';

/**
 * Read Repository Interface for Ingestion Jobs
 *
 * Provides query operations for ingestion jobs.
 * Follows CQRS pattern - read operations only, no save/delete.
 *
 * Requirements: All
 */
export interface IIngestionJobReadRepository {
  /**
   * Find job by ID
   * @param jobId - Job identifier
   * @returns Job read model or null if not found
   */
  findById(jobId: string): Promise<IngestionJobReadModel | null>;

  /**
   * Find jobs by status
   * @param status - Job status to filter by
   * @returns Array of job read models
   */
  findByStatus(status: string): Promise<IngestionJobReadModel[]>;

  /**
   * Find jobs by source ID
   * @param sourceId - Source identifier
   * @returns Array of job read models
   */
  findBySourceId(sourceId: string): Promise<IngestionJobReadModel[]>;
}
