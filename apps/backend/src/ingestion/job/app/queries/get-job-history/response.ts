/**
 * GetJobHistoryResponse
 *
 * Response type for GetJobHistoryQuery.
 * Query-specific response with job history for a source.
 *
 * Naming Convention: {QueryName}Response
 * Location: app/queries/<query-name>/response.ts
 *
 * Requirements: 6.4
 */

/**
 * Individual job item in the history response
 */
export interface JobHistoryItemResponse {
  jobId: string;
  sourceId: string;
  status: string;
  scheduledAt: Date;
  executedAt: Date | null;
  completedAt: Date | null;
  itemsCollected: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  bytesProcessed: number;
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response for GetJobHistoryQuery
 */
export interface GetJobHistoryResponse {
  jobs: JobHistoryItemResponse[];
  total: number;
}
