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
export * from './repositories';

// Factory interfaces (for aggregate reconstitution)
export * from './factories';

// Re-export from sub-contexts
export * from '@/ingestion/source/domain/interfaces/source-adapter';
