/**
 * IngestionJobDto
 *
 * Application DTO for ingestion job data transfer.
 * This is a plain object used for transferring job data between layers.
 * Contains all job properties in a flat structure for efficient querying.
 *
 * NOT a CQRS Read Model - queries write table directly
 *
 * Requirements: 3.1, 8.1
 */
export interface IngestionJobDto {
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

  // Source configuration (as JSON)
  sourceConfig: {
    sourceId: string;
    sourceType: string;
    name: string;
    config: Record<string, unknown>;
    credentials?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  // Version for optimistic locking
  version: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
