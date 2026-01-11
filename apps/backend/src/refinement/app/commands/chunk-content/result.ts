/**
 * ChunkContentResult
 *
 * Result of the ChunkContentCommand execution.
 * Contains information about the chunks created.
 *
 * Requirements: Refinement 2
 * Design: Application Layer - Command Results
 */
export class ChunkContentResult {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly chunkCount: number,
    public readonly chunkIds: string[],
    public readonly status: 'success' | 'rejected' | 'failed',
    public readonly rejectionReason?: string,
    public readonly error?: {
      code: string;
      message: string;
    },
  ) {}
}
