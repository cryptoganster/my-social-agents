export class JobCompletedEvent {
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
