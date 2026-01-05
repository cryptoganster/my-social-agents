/**
 * IngestionJobReadModel
 *
 * Optimized read model for querying ingestion jobs.
 * This is a plain object (not an aggregate) used for read operations.
 * Contains all job properties in a flat structure for efficient querying.
 *
 * Requirements: 4.1, 10.1
 */
export interface IngestionJobReadModel {
  jobId: string;
  sourceId: string;
  status: string;
  scheduledAt: Date;
  executedAt: Date | null;
  completedAt: Date | null;

  // Metrics (flattened)
  itemsCollected: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  bytesProcessed: number;
  durationMs: number;

  // Errors (as JSON or array)
  errors: Array<{
    errorId: string;
    timestamp: Date;
    errorType: string;
    message: string;
    stackTrace: string | null;
    retryCount: number;
  }>;

  // Version for optimistic locking
  version: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
