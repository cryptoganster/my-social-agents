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
   * Find jobs by status with pagination
   * @param status - Job status to filter by
   * @param limit - Maximum number of results to return
   * @param offset - Number of results to skip
   * @returns Array of job read models
   */
  findByStatus(
    status: string,
    limit?: number,
    offset?: number,
  ): Promise<IngestionJobReadModel[]>;

  /**
   * Count jobs by status
   * @param status - Job status to filter by
   * @returns Total count of jobs with the given status
   */
  countByStatus(status: string): Promise<number>;

  /**
   * Find jobs by source ID ordered by executedAt DESC
   * @param sourceId - Source identifier
   * @param limit - Maximum number of results to return
   * @returns Array of job read models
   */
  findBySourceId(
    sourceId: string,
    limit?: number,
  ): Promise<IngestionJobReadModel[]>;
}
