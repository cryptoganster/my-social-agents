/**
 * RefinementFailed Domain Event
 *
 * Published when a content refinement process fails due to an error.
 * This event is used for error tracking and alerting.
 *
 * Requirements: Refinement 10
 * Design: Domain Events section
 */
export class RefinementFailed {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly errorCode: string,
    public readonly errorMessage: string,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
