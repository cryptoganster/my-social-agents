/**
 * Factory Interfaces
 *
 * Factories handle the reconstitution of aggregates from persistence.
 * They load data from read repositories and reconstruct aggregates
 * with their full behavior and business logic.
 */

// Re-export from sub-contexts
export * from '@/ingestion/job/domain/interfaces/factories';
export * from '@/ingestion/content/domain/interfaces/factories';
export * from '@/ingestion/source/domain/interfaces/factories';
