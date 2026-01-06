/**
 * Write Repository Interfaces
 *
 * Following CQRS principles, write repositories are linked 1:1 with aggregates.
 * They only handle persistence operations (save, delete).
 * Read operations are handled by read repositories in the infrastructure layer.
 */

export * from './source-configuration-write';

// Re-export from sub-contexts
export * from '@/ingestion/job/domain/interfaces/repositories';
export * from '@/ingestion/content/domain/interfaces/repositories';
