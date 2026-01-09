/**
 * RefinementCompleted Domain Event
 *
 * Published when a content refinement process completes successfully.
 * This event triggers downstream processes like embedding and indexing.
 *
 * Requirements: Refinement 9
 * Design: Domain Events section
 */
export class RefinementCompleted {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkCount: number,
    public readonly durationMs: number,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
