# Content Ingestion Bounded Context

This module handles multi-source content collection and normalization for cryptocurrency-related information.

## Architecture

The module follows Clean Architecture and Domain-Driven Design principles with four distinct layers:

### Domain Layer (`domain/`)

Contains core business logic independent of infrastructure concerns:

- **Aggregates**: ContentItem, IngestionJob
- **Entities**: SourceConfiguration, ErrorRecord
- **Value Objects**: ContentHash, SourceType, IngestionStatus, ContentMetadata, JobMetrics, AssetTag
- **Domain Services**: ContentNormalizationService, DuplicateDetectionService, ContentValidationService
- **Interfaces**: Repository and provider contracts

### Application Layer (`app/`)

Orchestrates domain logic through use cases:

- IngestContentUseCase
- ScheduleIngestionJobUseCase
- ConfigureSourceUseCase
- ExecuteIngestionJobUseCase

### Infrastructure Layer (`infra/`)

Provides concrete implementations:

- **Repositories**: TypeORM implementations for persistence
- **Services**: Encryption, event publishing, scheduling, retry logic, circuit breakers
- **Adapters**: Source-specific implementations (web scraping, RSS, social media, PDF, OCR, Wikipedia)

### API Layer (`api/`)

Exposes functionality through interfaces:

- **CLI Commands**: Command-line interface
- **REST Controllers**: HTTP endpoints (optional)
- **DTOs**: Data transfer objects

## Testing

### Testing Framework

- **Unit Tests**: Jest
- **Property-Based Tests**: fast-check

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Property-Based Testing

Property-based tests validate universal correctness properties across many generated inputs. Each property test:

- Runs a minimum of 100 iterations
- References the design document property it validates
- Uses the tag format: `Feature: content-ingestion, Property {number}: {property_text}`

## Directory Structure

```
src/ingestion/
├── domain/
│   ├── aggregates/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   └── interfaces/
├── app/
│   └── use-cases/
├── infra/
│   ├── repositories/
│   ├── services/
│   └── adapters/
├── api/
│   ├── cli/
│   ├── controllers/
│   └── dtos/
└── index.ts
```

## Key Principles

1. **Dependency Inversion**: Domain layer depends on abstractions, not implementations
2. **Immutability**: Value objects are immutable and self-validating
3. **Invariant Enforcement**: Aggregates enforce business rules
4. **Stateless Services**: Domain and infrastructure services are stateless
5. **Pluggable Adapters**: Source adapters are swappable via dependency injection

## Requirements Mapping

This module implements requirements from the Content Ingestion specification:

- Requirements 1.1-1.7: Multi-source content collection
- Requirements 2.1-2.5: Content normalization and metadata extraction
- Requirements 3.1-3.4: Duplicate detection
- Requirements 4.1-4.6: Job scheduling and execution
- Requirements 5.1-5.5: Source configuration management
- Requirements 6.1-6.5: Error handling and resilience
- Requirements 7.1-7.5: Content quality validation
- Requirements 8.1-8.4: Architecture and modularity
- Requirements 10.1-10.5: Data persistence and events
