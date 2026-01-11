/**
 * StartJobResult
 *
 * Result of starting an ingestion job.
 * Confirms the job has transitioned to RUNNING state.
 *
 * Requirements: 4.3, 4.4
 */
export interface StartJobResult {
  jobId: string;
  sourceId: string;
  startedAt: Date;
}
