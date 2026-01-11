/**
 * FailJobResult
 *
 * Result of failing an ingestion job.
 * Confirms the job has transitioned to FAILED state.
 *
 * Requirements: 4.4, 4.6
 */
export interface FailJobResult {
  jobId: string;
  failedAt: Date;
  errorMessage: string;
}
