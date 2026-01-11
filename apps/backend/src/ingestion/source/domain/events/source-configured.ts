/**
 * SourceConfiguredEvent
 *
 * Domain event published when a source has been successfully configured.
 * Carries complete source state to enable event-carried state transfer pattern.
 *
 * Requirements: 1.1, 1.4, 5.1, 5.2
 */
export class SourceConfiguredEvent {
  constructor(
    public readonly sourceId: string,
    public readonly sourceType: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly configSummary: Record<string, any>,
    public readonly occurredAt: Date,
  ) {}
}
