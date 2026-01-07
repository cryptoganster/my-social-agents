/**
 * ScheduleIngestionJobResult
 *
 * Result of scheduling an ingestion job.
 * Contains the job ID and scheduled execution time.
 *
 * Requirements: 4.1, 4.2
 */
export interface ScheduleIngestionJobResult {
  jobId: string;
  sourceId: string;
  scheduledAt: Date;
  isScheduled: boolean;
}
