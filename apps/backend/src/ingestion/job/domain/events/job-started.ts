export class JobStartedEvent {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly startedAt: Date,
  ) {}
}
