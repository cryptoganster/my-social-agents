/**
 * ExecuteIngestionJobCommand
 *
 * Command to execute a scheduled or manual ingestion job.
 * Represents the intent to run a job, collect content, and update job state.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
export class ExecuteIngestionJobCommand {
  constructor(public readonly jobId: string) {}
}
