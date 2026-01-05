/**
 * Read Models
 *
 * Read models are optimized for queries and live in the domain layer as interfaces.
 * They provide efficient read operations without the overhead of aggregate behavior.
 * These are plain objects (not aggregates) used by read repositories in the infrastructure layer.
 *
 * Following CQRS principles:
 * - Read models are separate from aggregates
 * - Optimized for query performance
 * - No business logic, just data structures
 */

export * from './ingestion-job';
export * from './content-item';
export * from './source-configuration';
