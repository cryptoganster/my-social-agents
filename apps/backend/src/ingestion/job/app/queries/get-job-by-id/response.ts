/**
 * GetJobByIdResponse
 *
 * Response type for GetJobByIdQuery.
 * Query-specific response that maps from IngestionJobReadModel.
 *
 * Naming Convention: {QueryName}Response
 * Location: app/queries/<query-name>/response.ts
 *
 * Requirements: 6.1, 6.2
 */
export interface GetJobByIdResponse {
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
