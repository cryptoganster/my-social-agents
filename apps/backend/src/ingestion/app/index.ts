/**
 * Application Layer - Content Ingestion Bounded Context
 *
 * This layer contains use cases that orchestrate domain logic:
 * - IngestContentUseCase: Orchestrates the content ingestion pipeline
 * - ScheduleIngestionJobUseCase: Handles job scheduling
 * - ConfigureSourceUseCase: Manages source configuration
 * - ExecuteIngestionJobUseCase: Executes scheduled ingestion jobs
 */

// Use Cases
export * from './use-cases';
