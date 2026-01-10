/**
 * ContentCollectionRequestedEvent
 *
 * Domain event published when a job requests content collection from a source.
 * Carries complete source configuration to enable event-carried state transfer pattern.
 *
 * Requirements: 2.1, 5.1, 5.3
 */
export class ContentCollectionRequestedEvent {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly sourceType: string,
    public readonly sourceConfig: Record<string, any>,
    public readonly occurredAt: Date,
  ) {}
}
