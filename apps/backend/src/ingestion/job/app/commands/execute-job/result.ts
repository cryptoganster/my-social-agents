/**
 * ExecuteIngestionJobResult
 *
 * Result of executing an ingestion job.
 * Contains execution metrics and status information.
 *
 * Requirements: 4.5
 */
export interface ExecuteIngestionJobResult {
  jobId: string;
  success: boolean;
  itemsCollected: number;
  duplicatesDetected: number;
  errorsEncountered: number;
  bytesProcessed: number;
  durationMs: number;
  error?: string;
}
