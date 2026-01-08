/**
 * ScheduleJobResult
 *
 * Result of scheduling an ingestion job.
 * Contains the job ID and scheduled time.
 *
 * Requirements: 1.1, 1.2
 * Design: Commands - Job Commands
 */
export interface ScheduleJobResult {
  jobId: string;
  scheduledAt: Date;
}
