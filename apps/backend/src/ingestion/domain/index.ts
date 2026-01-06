/**
 * Domain Layer - Content Ingestion Bounded Context
 *
 * This layer contains the core business logic including:
 * - Aggregates: ContentItem, IngestionJob, SourceConfiguration
 * - Entities: ErrorRecord
 * - Value Objects: ContentHash, SourceType, IngestionStatus, ContentMetadata, JobMetrics, AssetTag
 * - Domain Services: ContentNormalizationService, DuplicateDetectionService, ContentValidationService
 * - Repository Interfaces: Write repositories (1 per aggregate)
 * - Factory Interfaces: Aggregate reconstitution factories
 * - Read Models: Optimized query models
 * - Provider Interfaces: SourceAdapter, EventPublisher
 */

// Aggregates
export * from './aggregates';

// Entities
export * from './entities';

// Value Objects
export * from './value-objects';

// Services
export * from './services';

// Interfaces
export * from './interfaces';

// Read Models
export * from './read-models';

// Re-export from Job sub-context for backward compatibility
export * from '@/ingestion/job/domain';
