import { IngestionJob } from '../../aggregates/ingestion-job';

/**
 * IngestionJobWriteRepository Interface
 *
 * Write-side persistence interface for IngestionJob aggregate.
 * Following CQRS principles, this repository only handles write operations.
 * Read operations are handled by read repositories in the infrastructure layer.
 *
 * Requirements: 4.1
 */
export interface IngestionJobWriteRepository {
  /**
   * Persists or updates an IngestionJob aggregate
   * Uses optimistic locking to prevent concurrent modifications
   * Throws ConcurrencyException if version mismatch occurs
   */
  save(job: IngestionJob): Promise<void>;
}
