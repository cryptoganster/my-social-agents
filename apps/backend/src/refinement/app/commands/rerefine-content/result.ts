/**
 * RerefineContentResult
 *
 * Result of re-refinement command execution.
 * Contains the outcome of the re-refinement process.
 *
 * Requirements: Refinement 11
 * Design: Application Layer - Command Results
 */

/**
 * Base result interface with common properties
 */
interface BaseRerefineContentResult {
  refinementId: string;
  contentItemId: string;
  reason: string;
}

/**
 * Result when re-refinement completes successfully
 */
export interface RerefineContentCompletedResult extends BaseRerefineContentResult {
  status: 'completed';
  chunkCount: number;
  durationMs: number;
  averageQualityScore: number;
  previousRefinementId?: string;
}

/**
 * Result when content is rejected during re-refinement
 */
export interface RerefineContentRejectedResult extends BaseRerefineContentResult {
  status: 'rejected';
  rejectionReason: string;
}

/**
 * Result when re-refinement fails with an error
 */
export interface RerefineContentFailedResult extends BaseRerefineContentResult {
  status: 'failed';
  error: {
    code: string;
    message: string;
  };
}

/**
 * Union type for all possible re-refinement results
 */
export type RerefineContentResult =
  | RerefineContentCompletedResult
  | RerefineContentRejectedResult
  | RerefineContentFailedResult;
