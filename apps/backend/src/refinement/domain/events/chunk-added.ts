/**
 * ChunkAdded Domain Event
 *
 * Published when a chunk is successfully added to a content refinement.
 * This event can be used for monitoring and analytics.
 *
 * Requirements: Refinement 2, 7
 * Design: Domain Events section
 */
export class ChunkAdded {
  public readonly occurredAt: Date;

  constructor(
    public readonly refinementId: string,
    public readonly chunkId: string,
    public readonly chunkHash: string,
    public readonly position: number,
  ) {
    this.occurredAt = new Date();
    Object.freeze(this);
  }
}
