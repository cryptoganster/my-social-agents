/**
 * Domain Aggregates
 *
 * Aggregates are clusters of domain objects that can be treated as a single unit.
 * Each aggregate has a root entity and enforces consistency boundaries.
 */

export * from './content-item';
export * from './source-configuration';

// Re-export from Job sub-context
export * from '@/ingestion/job/domain/aggregates';
