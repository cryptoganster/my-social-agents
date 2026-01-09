# Requirements Document: Decouple Bounded Contexts

## Introduction

This specification addresses critical architectural violations in the current codebase where bounded contexts and sub-contexts are tightly coupled through direct dependencies (factories, commands, queries, services). The system must be refactored to follow strict Event-Driven Architecture principles where all cross-context communication happens exclusively through domain events.

## Glossary

- **Bounded Context**: An explicit boundary within which a domain model is defined and applicable (e.g., Ingestion, Refinement)
- **Sub-Context**: A subdivision within a bounded context with its own domain model (e.g., Content, Job, Source within Ingestion)
- **Domain Event**: An immutable fact representing something that happened in the domain, used for cross-context communication
- **Event Handler**: A reactive component that responds to domain events
- **Command Handler**: A component that executes write operations within a bounded context
- **Direct Dependency**: When one context imports and uses classes/interfaces from another context (VIOLATION)
- **Event-Driven Communication**: Contexts communicate by publishing and subscribing to domain events (CORRECT)
- **Read Model**: A denormalized, query-optimized data structure for reading data across contexts
- **Anti-Corruption Layer (ACL)**: A protective layer that translates between different domain models

## Requirements

### Requirement 1: Eliminate Cross-Context Factory Dependencies

**User Story:** As a system architect, I want bounded contexts to be completely independent, so that they can evolve and be deployed separately without breaking other contexts.

#### Acceptance Criteria

1. WHEN a bounded context needs data from another context, THE system SHALL use domain events to communicate the data
2. WHEN a command handler requires data from another context, THE system SHALL use read models or event-carried state transfer
3. THE Refinement context SHALL NOT inject IContentItemFactory from the Ingestion context
4. THE system SHALL provide data through events rather than through factory method calls
5. WHEN an aggregate is created in one context and needed in another, THE creating context SHALL publish an event with all necessary data

### Requirement 2: Eliminate Cross-Sub-Context Command Dependencies

**User Story:** As a developer, I want sub-contexts within a bounded context to communicate through events, so that they maintain clear boundaries and can be refactored independently.

#### Acceptance Criteria

1. WHEN a sub-context needs to trigger an action in another sub-context, THE system SHALL publish a domain event
2. WHEN the Content sub-context needs to update Job metrics, THE system SHALL publish a ContentIngestedEvent that the Job sub-context listens to
3. WHEN the Job sub-context needs to trigger content ingestion, THE system SHALL publish a JobScheduledEvent that the Content sub-context listens to
4. THE system SHALL NOT allow direct command execution between sub-contexts
5. WHEN a sub-context event handler receives an event, THE handler SHALL execute a local command within its own sub-context

### Requirement 3: Eliminate Cross-Sub-Context Query Dependencies

**User Story:** As a developer, I want sub-contexts to access data from other sub-contexts through read models, so that read and write concerns are properly separated.

#### Acceptance Criteria

1. WHEN a sub-context needs to read data from another sub-context, THE system SHALL use a read repository or read model
2. WHEN the Job sub-context needs source information, THE system SHALL query a SourceReadModel rather than using ISourceConfigurationFactory
3. WHEN the Job sub-context needs to validate source health, THE system SHALL use a read model populated by Source events
4. THE system SHALL maintain read models that are updated by domain events
5. WHEN a source is created or updated, THE Source sub-context SHALL publish events that update the read model

### Requirement 4: Eliminate Cross-Sub-Context Service Dependencies

**User Story:** As a developer, I want sub-contexts to have their own domain services, so that business logic is properly encapsulated within context boundaries.

#### Acceptance Criteria

1. WHEN a sub-context needs functionality from another sub-context, THE system SHALL duplicate the logic or use shared kernel utilities
2. WHEN the Content sub-context needs source adapters, THE system SHALL access them through its own adapter registry
3. THE system SHALL NOT allow direct injection of domain services across sub-context boundaries
4. WHEN shared logic is identified, THE system SHALL move it to a shared kernel module
5. WHEN a sub-context publishes an event, THE event SHALL contain all data needed by subscribers to avoid cross-context queries

### Requirement 5: Implement Event-Carried State Transfer

**User Story:** As a system architect, I want events to carry complete state information, so that subscribers don't need to query the publishing context for additional data.

#### Acceptance Criteria

1. WHEN a domain event is published, THE event SHALL contain all data that subscribers might need
2. WHEN ContentIngestedEvent is published, THE event SHALL include contentId, sourceId, normalizedContent, metadata, and assetTags
3. WHEN JobScheduledEvent is published, THE event SHALL include jobId, sourceId, and source configuration summary
4. WHEN SourceConfiguredEvent is published, THE event SHALL include sourceId, sourceType, name, and isActive status
5. THE system SHALL avoid "thin" events that only contain IDs requiring subscribers to query for more data

### Requirement 6: Create Read Models for Cross-Context Queries

**User Story:** As a developer, I want read models that aggregate data from multiple contexts, so that queries don't create coupling between contexts.

#### Acceptance Criteria

1. WHEN a context needs to query data from another context, THE system SHALL provide a read model
2. WHEN the Job sub-context needs source information, THE system SHALL query SourceReadModel
3. WHEN the Refinement context needs content information, THE system SHALL query ContentItemReadModel
4. THE system SHALL update read models through event handlers
5. WHEN a source is updated, THE SourceConfiguredEvent SHALL trigger an update to SourceReadModel

### Requirement 7: Implement Event Handlers for All Cross-Context Communication

**User Story:** As a developer, I want all cross-context communication to happen through event handlers, so that contexts remain loosely coupled and can process events asynchronously.

#### Acceptance Criteria

1. WHEN a context needs to react to another context's action, THE system SHALL use an event handler
2. WHEN ContentIngestedEvent is published, THE Refinement context SHALL have an event handler that triggers RefineContentCommand
3. WHEN JobScheduledEvent is published, THE Content sub-context SHALL have an event handler that triggers content collection
4. WHEN JobCompletedEvent is published, THE Source sub-context SHALL have an event handler that updates source health
5. THE system SHALL ensure event handlers catch errors and log them without rethrowing (error isolation)

### Requirement 8: Refactor Command Handlers to Remove Cross-Context Dependencies

**User Story:** As a developer, I want command handlers to only depend on interfaces within their own bounded context, so that contexts can be tested and deployed independently.

#### Acceptance Criteria

1. WHEN a command handler is created, THE handler SHALL only inject interfaces from its own bounded context
2. WHEN RefineContentCommandHandler needs content data, THE handler SHALL receive it through the RefineContentCommand or query a local read model
3. WHEN IngestContentCommandHandler needs source configuration, THE handler SHALL query a local read model populated by Source events
4. THE system SHALL ensure all command handlers follow the dependency inversion principle within context boundaries
5. WHEN a command handler needs to trigger actions in another context, THE handler SHALL publish a domain event

### Requirement 9: Create Shared Read Models Where Necessary

**User Story:** As a developer, I want shared read models for data that multiple contexts need to query, so that contexts can access data without creating dependencies.

#### Acceptance Criteria

1. WHEN multiple contexts need the same data, THE system SHALL provide a shared read model
2. WHEN both Job and Content sub-contexts need source information, THE system SHALL provide a shared SourceReadModel
3. WHEN the Refinement context needs content metadata, THE system SHALL provide a ContentItemReadModel
4. THE system SHALL update shared read models through event handlers
5. WHEN a shared read model is updated, THE update SHALL be triggered by domain events from the owning context

### Requirement 10: Document Event-Driven Communication Patterns

**User Story:** As a developer, I want clear documentation of all event-driven communication patterns, so that I can understand how contexts interact and maintain the architecture.

#### Acceptance Criteria

1. WHEN a new developer joins the project, THE documentation SHALL clearly show all event flows between contexts
2. WHEN a domain event is created, THE documentation SHALL specify which contexts publish it and which subscribe to it
3. THE system SHALL maintain a diagram showing all event flows between bounded contexts and sub-contexts
4. THE documentation SHALL include examples of correct event-driven patterns
5. THE documentation SHALL include anti-patterns to avoid (direct dependencies, synchronous calls)

### Requirement 11: Implement Event Versioning Strategy

**User Story:** As a system architect, I want a strategy for evolving domain events over time, so that contexts can evolve independently without breaking subscribers.

#### Acceptance Criteria

1. WHEN a domain event structure needs to change, THE system SHALL support multiple event versions
2. WHEN an event is published, THE event SHALL include a version field
3. WHEN an event handler receives an event, THE handler SHALL handle multiple event versions gracefully
4. THE system SHALL allow old event versions to be deprecated gradually
5. WHEN a new event version is introduced, THE system SHALL maintain backward compatibility for at least one release cycle

### Requirement 12: Ensure Event Handler Idempotency

**User Story:** As a developer, I want event handlers to be idempotent, so that processing the same event multiple times doesn't cause data corruption or duplicate actions.

#### Acceptance Criteria

1. WHEN an event handler processes an event, THE handler SHALL check if the event has already been processed
2. WHEN an event is processed multiple times, THE system SHALL produce the same result
3. THE system SHALL track processed events to prevent duplicate processing
4. WHEN an event handler fails, THE system SHALL allow safe retry without side effects
5. WHEN implementing idempotency, THE system SHALL use event IDs or correlation IDs to track processing

### Requirement 13: Implement Saga Pattern for Complex Workflows

**User Story:** As a developer, I want to use the Saga pattern for complex multi-step workflows, so that long-running processes can be coordinated across contexts without tight coupling.

#### Acceptance Criteria

1. WHEN a workflow spans multiple contexts, THE system SHALL use a Saga to coordinate the workflow
2. WHEN content ingestion → refinement → embedding workflow is needed, THE system SHALL implement a ContentProcessingSaga
3. WHEN a step in a Saga fails, THE system SHALL trigger compensating actions
4. THE system SHALL track Saga state to handle failures and retries
5. WHEN a Saga completes, THE system SHALL publish a completion event

### Requirement 14: Remove All Direct Imports Between Contexts

**User Story:** As a system architect, I want to enforce context boundaries at the code level, so that developers cannot accidentally create coupling between contexts.

#### Acceptance Criteria

1. WHEN code is compiled, THE system SHALL fail if a context imports from another context's domain or application layers
2. WHEN the Refinement context is compiled, THE system SHALL NOT allow imports from @/ingestion/content/domain
3. WHEN the Content sub-context is compiled, THE system SHALL NOT allow imports from @/ingestion/job/app/commands
4. THE system SHALL allow imports from shared kernel modules
5. WHEN a linting rule is violated, THE system SHALL provide a clear error message explaining the architectural violation

### Requirement 15: Create Integration Tests for Event Flows

**User Story:** As a developer, I want integration tests that verify event flows between contexts, so that I can ensure the event-driven architecture works correctly end-to-end.

#### Acceptance Criteria

1. WHEN integration tests run, THE tests SHALL verify that events flow correctly between contexts
2. WHEN ContentIngestedEvent is published, THE test SHALL verify that RefineContentCommand is triggered in the Refinement context
3. WHEN JobScheduledEvent is published, THE test SHALL verify that content collection begins
4. THE system SHALL provide test utilities for publishing events and verifying handlers are triggered
5. WHEN an event flow test fails, THE test SHALL provide clear diagnostics showing which handler failed

## Non-Functional Requirements

### Performance

1. Event processing SHALL NOT introduce more than 100ms latency between contexts
2. Read models SHALL be updated within 1 second of the triggering event
3. Event handlers SHALL process events asynchronously without blocking the publishing context

### Reliability

1. Event handlers SHALL implement error isolation (log errors but don't rethrow)
2. Failed event processing SHALL NOT prevent other events from being processed
3. The system SHALL support event replay for recovery scenarios

### Maintainability

1. All event-driven patterns SHALL be documented with examples
2. New developers SHALL be able to understand event flows within 1 day
3. Adding a new event handler SHALL NOT require changes to existing code

### Testability

1. All event handlers SHALL be unit testable with mocked dependencies
2. Integration tests SHALL verify event flows between contexts
3. Event publishing SHALL be mockable for testing command handlers

## Success Criteria

1. Zero direct dependencies between bounded contexts (verified by linting rules)
2. Zero direct dependencies between sub-contexts (verified by linting rules)
3. All cross-context communication happens through domain events
4. All command handlers only depend on interfaces within their own context
5. Read models are used for all cross-context queries
6. Event handlers implement error isolation
7. Integration tests verify all event flows
8. Documentation clearly shows all event-driven patterns
9. New features can be added without modifying existing contexts
10. Contexts can be deployed independently

## Out of Scope

1. Implementing distributed event bus (using NestJS EventBus for now)
2. Event sourcing (events are used for communication, not as source of truth)
3. CQRS read model projections (simple read models only)
4. Complex Saga orchestration (simple Sagas only)
5. Event schema registry (manual versioning for now)
