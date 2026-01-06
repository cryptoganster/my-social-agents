/**
 * Domain Aggregates
 *
 * Aggregates are clusters of domain objects that can be treated as a single unit.
 * Each aggregate has a root entity and enforces consistency boundaries.
 */

export * from './source-configuration';

// Re-export from sub-contexts
export * from '@/ingestion/job/domain/aggregates';
export * from '@/ingestion/content/domain/aggregates';
