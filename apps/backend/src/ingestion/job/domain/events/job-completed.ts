/**
 * JobCompleted Domain Event
 *
 * Represents the fact that an ingestion job has completed successfully.
 * Published when a job transitions to COMPLETED state.
 *
 * Requirements: 4.5
 */
export class JobCompleted {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly metrics: {
      itemsCollected: number;
      itemsPersisted: number;
      duplicatesDetected: number;
      validationErrors: number;
      duration: number;
    },
    public readonly completedAt: Date,
  ) {}
}
