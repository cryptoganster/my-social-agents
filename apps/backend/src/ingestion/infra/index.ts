/**
 * Infrastructure Layer - Content Ingestion Bounded Context
 *
 * This layer contains infrastructure implementations:
 * - Persistence: TypeORM repositories, factories, and entities
 * - External: NodeHash (cryptographic hashing)
 * - Services: CredentialEncryptionService, EventPublisherService, JobSchedulerService, RetryService, CircuitBreakerService (to be implemented)
 * - Adapters: WebScraperAdapter, RssFeedAdapter, SocialMediaAdapter, PdfAdapter, OcrAdapter, WikipediaAdapter (to be implemented)
 */

// Persistence layer
export * from './persistence';

// External services
export * from './external';
