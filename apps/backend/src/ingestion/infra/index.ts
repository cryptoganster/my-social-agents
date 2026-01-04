/**
 * Infrastructure Layer - Content Ingestion Bounded Context
 *
 * This layer contains infrastructure implementations:
 * - External: NodeHash (cryptographic hashing)
 * - Repositories: TypeOrmIngestionJobRepository, TypeOrmContentItemRepository, TypeOrmSourceConfigurationRepository (to be implemented)
 * - Services: CredentialEncryptionService, EventPublisherService, JobSchedulerService, RetryService, CircuitBreakerService (to be implemented)
 * - Adapters: WebScraperAdapter, RssFeedAdapter, SocialMediaAdapter, PdfAdapter, OcrAdapter, WikipediaAdapter (to be implemented)
 */

// External services
export * from './external';
