/**
 * Domain Interfaces
 *
 * Interfaces define contracts for repositories, factories, and external providers.
 * They allow the domain layer to remain independent of infrastructure concerns.
 *
 * Following CQRS principles:
 * - Write repositories are linked to aggregates (1:1 relationship)
 * - Read operations use read models and read repositories (in infra layer)
 * - Factories handle aggregate reconstitution from persistence
 */

// Write repository interfaces (1 per aggregate)
// export * from './repositories/ingestion-job-write';
// export * from './repositories/content-item-write';

// Factory interfaces (for aggregate reconstitution)
// export * from './factories/ingestion-job-factory';
// export * from './factories/content-item-factory';

// Provider interfaces
export * from './source-adapter';
export * from './event-publisher';
