/**
 * Shared Kernel - Ingestion Bounded Context
 *
 * Contains shared entities, value objects, interfaces, and infrastructure
 * that are used across multiple sub-contexts (Job, Content, Source).
 */

// Entities
export * from './entities';

// Interfaces
export * from './interfaces/external';

// Infrastructure
export * from './infra/external';
