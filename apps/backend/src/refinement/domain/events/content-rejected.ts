/**
 * ContentRejected Domain Event
 *
 * Published when content is rejected during refinement (e.g., due to low quality).
 * This event is used for quality monitoring and content filtering analytics.
 *
 * Requirements: Refinement 1.4, 5, 6
 * Design: Domain Events section
 */
export class ContentRejected {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly reason: string,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
