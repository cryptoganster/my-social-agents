/**
 * FinalizeRefinementResult
 *
 * Result of the FinalizeRefinementCommand execution.
 * Contains the final status and metrics of the refinement process.
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Command Results
 */
export class FinalizeRefinementResult {
  constructor(
    public readonly refinementId: string,
    public readonly contentItemId: string,
    public readonly status: 'completed' | 'rejected' | 'failed',
    public readonly totalChunks: number,
    public readonly validChunks: number,
    public readonly durationMs: number,
    public readonly averageQualityScore?: number,
    public readonly rejectionReason?: string,
    public readonly error?: {
      code: string;
      message: string;
    },
  ) {}
}
