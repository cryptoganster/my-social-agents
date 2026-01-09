import { ChunkReadModel } from './chunk';

/**
 * ContentRefinementReadModel
 *
 * Plain object representation of ContentRefinement for read operations.
 * Optimized for queries, no behavior.
 *
 * Requirements: Refinement 1, 9, 10
 * Design: Read Models section
 */
export interface ContentRefinementReadModel {
  id: string;
  contentItemId: string;
  status: string;
  error: {
    message: string;
    code: string;
    stackTrace: string | null;
    occurredAt: Date;
  } | null;
  startedAt: Date | null;
  completedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  chunkCount: number;
  chunks?: ChunkReadModel[]; // Optional: Include chunks in read model
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
