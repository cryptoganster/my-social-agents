/**
 * Content Ingestion Bounded Context
 *
 * This module handles multi-source content collection and normalization for cryptocurrency-related information.
 *
 * Key Responsibilities:
 * - Collect content from multiple sources (web, RSS, social media, PDFs, OCR, Wikipedia)
 * - Normalize and validate content
 * - Detect and handle duplicates
 * - Extract metadata and asset tags
 * - Schedule and execute ingestion jobs
 * - Manage source configurations
 *
 * Architecture:
 * - Domain Layer: Core business logic, aggregates, entities, value objects, services
 * - Application Layer: Use cases that orchestrate domain logic
 * - Infrastructure Layer: Concrete implementations of repositories, adapters, and services (in sub-contexts)
 * - API Layer: CLI commands and REST controllers
 *
 * Sub-contexts:
 * - Job: Ingestion job management
 * - Content: Content item processing
 * - Source: Source configuration management
 * - Shared: Shared entities, value objects, and infrastructure
 */

// Export domain layer (includes re-exports from sub-contexts)
export * from './domain';

// Export sub-contexts
export * from './job/domain';
export * from './content/domain';
export * from './source/domain';
export * from './shared';
