/**
 * Domain Aggregates
 *
 * Aggregates are clusters of domain objects that can be treated as a single unit.
 * Each aggregate has a root entity and enforces consistency boundaries.
 */

// Re-export from sub-contexts
export * from '@/ingestion/job/domain/aggregates';
export * from '@/ingestion/content/domain/aggregates';
export * from '@/ingestion/source/domain/aggregates';
