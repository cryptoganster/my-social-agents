/**
 * JobScheduled Domain Event
 *
 * Represents the fact that an ingestion job has been scheduled.
 * Published when a new job is created and scheduled for execution.
 *
 * Requirements: 4.1
 */
export class JobScheduled {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly scheduledAt: Date,
  ) {}
}
