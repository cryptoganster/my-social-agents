export class JobScheduledEvent {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly scheduledAt: Date,
  ) {}
}
