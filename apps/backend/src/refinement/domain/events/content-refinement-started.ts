/**
 * ContentRefinementStarted Domain Event
 *
 * Published when a content refinement process starts.
 * This event signals to other bounded contexts that refinement has begun.
 *
 * Requirements: Refinement 1.3
 * Design: Domain Events section
 */
export class ContentRefinementStarted {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
