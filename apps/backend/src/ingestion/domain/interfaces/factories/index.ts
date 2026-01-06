/**
 * Factory Interfaces
 *
 * Factories handle the reconstitution of aggregates from persistence.
 * They load data from read repositories and reconstruct aggregates
 * with their full behavior and business logic.
 */

export * from './content-item-factory';
export * from './source-configuration-factory';

// Re-export from Job sub-context
export * from '@/ingestion/job/domain/interfaces/factories';
