/**
 * GetJobsByStatusResponse
 *
 * Response type for GetJobsByStatusQuery.
 * Query-specific response with paginated job list.
 *
 * Naming Convention: {QueryName}Response
 * Location: app/queries/<query-name>/response.ts
 *
 * Requirements: 6.3
 */

/**
 * Individual job item in the response
 */
export interface JobByStatusItemResponse {
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
 * Paginated response for GetJobsByStatusQuery
 */
export interface GetJobsByStatusResponse {
  jobs: JobByStatusItemResponse[];
  total: number;
}
