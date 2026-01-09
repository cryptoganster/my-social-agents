/**
 * SourceUnhealthyEvent
 *
 * Domain event published when a source has become unreliable based on
 * failure rate and consecutive failures exceeding configured thresholds.
 *
 * This event signals that the source should be disabled or flagged for
 * administrator review.
 *
 * Requirements: 4.1, 4.2, 4.7
 */
export class SourceUnhealthyEvent {
  constructor(
    public readonly sourceId: string,
    public readonly failureRate: number,
    public readonly consecutiveFailures: number,
    public readonly detectedAt: Date,
  ) {}
}
