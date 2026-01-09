export class JobFailedEvent {
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
