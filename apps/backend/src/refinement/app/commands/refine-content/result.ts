/**
 * RefineContentResult
 *
 * Result of content refinement operation.
 * Contains summary information about the refinement process.
 *
 * Requirements: Refinement 9
 * Design: Application Layer - Commands
 */
export interface RefineContentResult {
  /**
   * ID of the refined content aggregate
   */
  refinementId: string;

  /**
   * ID of the content item that was refined
   */
  contentItemId: string;

  /**
   * Final status of the refinement
   */
  status: 'completed' | 'failed' | 'rejected';

  /**
   * Number of chunks created
   * Only present if status is 'completed'
   */
  chunkCount?: number;

  /**
   * Duration of refinement process in milliseconds
   * Only present if status is 'completed' or 'failed'
   */
  durationMs?: number;

  /**
   * Average quality score of chunks
   * Only present if status is 'completed'
   */
  averageQualityScore?: number;

  /**
   * Error information
   * Only present if status is 'failed'
   */
  error?: {
    code: string;
    message: string;
  };

  /**
   * Rejection reason
   * Only present if status is 'rejected'
   */
  rejectionReason?: string;
}
