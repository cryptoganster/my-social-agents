/**
 * JobFailed Domain Event
 *
 * Represents the fact that an ingestion job has failed.
 * Published when a job transitions to FAILED state.
 *
 * Requirements: 4.6
 */
export class JobFailed {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly error: {
      message: string;
      type: string;
      stack?: string;
    },
    public readonly failedAt: Date,
  ) {}
}
