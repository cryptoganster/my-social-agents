/**
 * JobMetricsUpdateRequestedEvent
 *
 * Domain event published when content processing completes and job metrics need updating.
 * Carries metrics update data to enable event-carried state transfer pattern.
 *
 * Requirements: 2.1, 5.1, 5.5
 */
export class JobMetricsUpdateRequestedEvent {
  constructor(
    public readonly jobId: string,
    public readonly metricsUpdate: {
      itemsPersisted?: number;
      duplicatesDetected?: number;
      validationErrors?: number;
    },
    public readonly occurredAt: Date,
  ) {}
}
