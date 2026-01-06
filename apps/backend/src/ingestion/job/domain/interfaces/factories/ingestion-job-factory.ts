import { IngestionJob } from '../../aggregates/ingestion-job';

/**
 * IngestionJobFactory Interface
 *
 * Factory for reconstituting IngestionJob aggregates from persistence.
 * Uses read repositories internally to load data and reconstructs
 * the aggregate with its full behavior.
 *
 * Requirements: 4.1, 10.1
 */
export interface IngestionJobFactory {
  /**
   * Loads and reconstitutes an IngestionJob aggregate from persistence
   * Returns null if the job does not exist
   * The reconstituted aggregate includes full business logic and behavior
   */
  load(jobId: string): Promise<IngestionJob | null>;
}
