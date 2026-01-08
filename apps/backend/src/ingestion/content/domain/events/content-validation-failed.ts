/**
 * ContentValidationFailedEvent
 *
 * Domain event published when content fails validation.
 * Signals that content did not meet quality or completeness requirements.
 *
 * Requirements: 2.3, 9.2, 9.3, 9.4
 */
export class ContentValidationFailedEvent {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly content: string,
    public readonly validationErrors: string[],
    public readonly failedAt: Date,
  ) {}
}
