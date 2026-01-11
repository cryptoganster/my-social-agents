/**
 * SourceHealthUpdatedEvent
 *
 * Domain event published when a source's health metrics have been updated.
 * Carries complete health metrics to enable event-carried state transfer pattern.
 *
 * Requirements: 5.1, 5.2
 */
export class SourceHealthUpdatedEvent {
  constructor(
    public readonly sourceId: string,
    public readonly healthMetrics: {
      consecutiveFailures: number;
      successRate: number;
      lastSuccessAt: Date | null;
      lastFailureAt: Date | null;
    },
    public readonly occurredAt: Date,
  ) {}
}
