/**
 * AllChunksProcessed Domain Event
 *
 * Published when all chunks in a refinement have been processed (enriched).
 * This event triggers the finalization of the refinement process.
 *
 * Requirements: Refinement 9
 * Design: Domain Events section - Event-Driven Pipeline
 */
export class AllChunksProcessed {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly totalChunks: number,
    public readonly validChunks: number,
    public readonly rejectedChunks: number,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
