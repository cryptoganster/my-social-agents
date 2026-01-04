/**
 * Domain Layer - Content Ingestion Bounded Context
 *
 * This layer contains the core business logic including:
 * - Aggregates: ContentItem, IngestionJob
 * - Entities: SourceConfiguration, ErrorRecord
 * - Value Objects: ContentHash, SourceType, IngestionStatus, ContentMetadata, JobMetrics, AssetTag
 * - Domain Services: ContentNormalizationService, DuplicateDetectionService, ContentValidationService
 * - Repository Interfaces: IIngestionJobRepository, IContentItemRepository, ISourceConfigurationRepository
 * - Provider Interfaces: ISourceAdapter, IEventPublisher
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
