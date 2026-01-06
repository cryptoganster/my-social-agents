/**
 * Domain Value Objects
 *
 * Value objects are immutable objects that describe characteristics of things.
 * They have no conceptual identity and are defined by their attributes.
 */

export * from '@/ingestion/shared/value-objects/content-hash';
export * from './source-type';
export * from './content-metadata';
export * from './asset-tag';

// Re-export from Job sub-context
export * from '@/ingestion/job/domain/value-objects';
