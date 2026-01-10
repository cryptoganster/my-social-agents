/**
 * CompleteJobResult
 *
 * Result of completing an ingestion job.
 * Confirms the job has transitioned to COMPLETED state with final metrics.
 *
 * Requirements: 4.4, 4.5
 */
export interface CompleteJobResult {
  jobId: string;
  completedAt: Date;
  metrics: {
    itemsCollected: number;
    duplicatesDetected: number;
    errorsEncountered: number;
    bytesProcessed: number;
    durationMs: number;
  };
}
