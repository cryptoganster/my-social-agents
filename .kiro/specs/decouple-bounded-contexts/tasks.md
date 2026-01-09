# Implementation Plan: Decouple Bounded Contexts

## Overview

This implementation plan refactors the system to eliminate all direct dependencies between bounded contexts and sub-contexts, implementing a pure event-driven architecture. The work is organized into phases to minimize disruption and allow incremental validation.

## Tasks

- [ ] 1. Create shared infrastructure for event-driven architecture
  - Set up shared read model infrastructure
  - Create base classes for read model updaters
  - Implement event versioning utilities
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 2. Phase 1: Create new domain events with complete state
  - [ ] 2.1 Create SourceConfiguredEvent with full source data
    - Include sourceId, sourceType, name, isActive, configSummary
    - _Requirements: 1.1, 1.4, 5.1, 5.2_

  - [ ] 2.2 Create SourceHealthUpdatedEvent with health metrics
    - Include sourceId, healthMetrics (consecutiveFailures, successRate, timestamps)
    - _Requirements: 5.1, 5.2_

  - [ ] 2.3 Create ContentCollectionRequestedEvent
    - Include jobId, sourceId, sourceType, sourceConfig
    - _Requirements: 2.1, 5.1, 5.3_

  - [ ] 2.4 Enhance ContentIngestedEvent with full content data
    - Add normalizedContent, full metadata object
    - Maintain backward compatibility with existing subscribers
    - _Requirements: 1.1, 1.4, 5.1, 5.4_

  - [ ] 2.5 Create JobMetricsUpdateRequestedEvent
    - Include jobId, metricsUpdate (itemsPersisted, duplicatesDetected, validationErrors)
    - _Requirements: 2.1, 5.1, 5.5_

- [ ]* 2.6 Write property test for event-carried state completeness
  - **Property 1: Event-Carried State Completeness**
  - **Validates: Requirements 1.1, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 3. Phase 2: Create read models and repositories
  - [ ] 3.1 Create SourceReadModel interface and entity
    - Define interface with sourceId, sourceType, name, isActive, healthMetrics, configSummary
    - Create TypeORM entity for persistence
    - _Requirements: 3.1, 3.2, 6.1, 6.2_

  - [ ] 3.2 Create ISourceReadRepository interface
    - Define findById, findByType, findActive methods
    - _Requirements: 3.1, 3.2, 6.1_

  - [ ] 3.3 Implement TypeOrmSourceReadRepository
    - Implement all query methods
    - Optimize with indexes
    - _Requirements: 3.1, 3.2, 6.1_

  - [ ] 3.4 Create ContentItemReadModel interface and entity
    - Define interface with contentId, sourceId, contentHash, normalizedContent, metadata, assetTags
    - Create TypeORM entity for persistence
    - _Requirements: 3.1, 6.2, 6.3_

  - [ ] 3.5 Create IContentItemReadRepository interface
    - Define findById, findByHash, findBySourceId methods
    - _Requirements: 3.1, 6.2_

  - [ ] 3.6 Implement TypeOrmContentItemReadRepository
    - Implement all query methods
    - Optimize with indexes
    - _Requirements: 3.1, 6.2_

- [ ]* 3.7 Write property test for read model query independence
  - **Property 8: Read Model Query Independence**
  - **Validates: Requirements 3.1, 3.2, 3.3, 6.1, 6.2, 6.3**

- [ ] 4. Checkpoint - Verify read model infrastructure
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Phase 3: Create read model updaters (event handlers)
  - [ ] 5.1 Create SourceConfiguredEventHandler to update SourceReadModel
    - Listen to SourceConfiguredEvent
    - Update SourceReadModel with source data
    - Implement error isolation
    - _Requirements: 3.4, 3.5, 6.4, 6.5, 7.1_

  - [ ] 5.2 Create SourceHealthUpdatedEventHandler to update SourceReadModel
    - Listen to SourceHealthUpdatedEvent
    - Update health metrics in SourceReadModel
    - Implement error isolation
    - _Requirements: 3.4, 3.5, 6.4, 6.5, 7.1_

  - [ ] 5.3 Create ContentIngestedEventHandler to update ContentItemReadModel
    - Listen to ContentIngestedEvent
    - Update ContentItemReadModel with content data
    - Implement error isolation
    - _Requirements: 3.4, 6.4, 6.5, 7.1_

  - [ ] 5.4 Implement idempotency checks in all read model updaters
    - Check if event already processed
    - Use event IDs or correlation IDs
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 5.5 Write property test for event handler idempotency
  - **Property 5: Event Handler Idempotency**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [ ]* 5.6 Write property test for error isolation in event handlers
  - **Property 6: Error Isolation in Event Handlers**
  - **Validates: Requirements 7.5**

- [ ] 6. Phase 4: Refactor Source sub-context to publish events
  - [ ] 6.1 Update ConfigureSourceCommandHandler to publish SourceConfiguredEvent
    - After persisting source, publish event with full source data
    - Include configSummary (sanitized config without credentials)
    - _Requirements: 1.1, 1.4, 5.1, 5.2_

  - [ ] 6.2 Update UpdateSourceHealthCommandHandler to publish SourceHealthUpdatedEvent
    - After updating health, publish event with health metrics
    - _Requirements: 5.1, 5.2_

  - [ ] 6.3 Update existing event handlers to use new events
    - Ensure backward compatibility during transition
    - _Requirements: 11.4, 11.5_

- [ ]* 6.4 Write integration test for source event flow
  - Verify SourceConfiguredEvent updates SourceReadModel
  - Verify SourceHealthUpdatedEvent updates SourceReadModel
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 7. Phase 5: Refactor Job sub-context to use read models
  - [ ] 7.1 Update ScheduleJobCommandHandler to use SourceReadRepository
    - Remove ISourceConfigurationFactory dependency
    - Query SourceReadModel for source validation
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 8.1, 8.2, 8.3_

  - [ ] 7.2 Update ExecuteIngestionJobCommandHandler to publish ContentCollectionRequestedEvent
    - Remove IngestContentCommand dependency
    - Publish event with jobId, sourceId, sourceType, sourceConfig
    - _Requirements: 2.1, 2.4, 5.1, 5.3, 8.4_

  - [ ] 7.3 Create UpdateJobMetricsEventHandler in Job sub-context
    - Listen to JobMetricsUpdateRequestedEvent
    - Execute UpdateJobMetricsCommand locally
    - Implement error isolation
    - _Requirements: 2.1, 2.5, 7.1, 7.2_

- [ ]* 7.4 Write property test for no direct cross-context dependencies
  - **Property 2: No Direct Cross-Context Dependencies**
  - **Validates: Requirements 1.1, 1.2, 1.3, 2.4, 8.1, 8.2, 8.3, 8.4, 14.1, 14.2, 14.3**

- [ ] 8. Checkpoint - Verify Job sub-context refactoring
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Phase 6: Refactor Content sub-context to use events
  - [ ] 9.1 Create ContentCollectionEventHandler in Content sub-context
    - Listen to ContentCollectionRequestedEvent
    - Execute IngestContentCommand locally with source data from event
    - Implement error isolation
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 7.1, 7.3_

  - [ ] 9.2 Update IngestContentCommandHandler to use SourceReadRepository
    - Remove ISourceConfigurationFactory dependency
    - Remove AdapterRegistry dependency (move to Content sub-context)
    - Query SourceReadModel for source configuration
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 8.1, 8.2, 8.3_

  - [ ] 9.3 Move AdapterRegistry to Content sub-context
    - AdapterRegistry is Content sub-context concern
    - Remove dependency from Source sub-context
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 9.4 Update ContentCollectedEventHandler to publish JobMetricsUpdateRequestedEvent
    - Remove UpdateJobMetricsCommand dependency
    - Publish event when content is persisted or duplicate detected
    - _Requirements: 2.1, 2.4, 5.1, 5.5, 8.4_

- [ ]* 9.5 Write property test for event handler triggers local commands
  - **Property 3: Event Handler Triggers Local Commands**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 7.4**

- [ ]* 9.6 Write integration test for content collection event flow
  - Verify ContentCollectionRequestedEvent triggers IngestContentCommand
  - Verify JobMetricsUpdateRequestedEvent updates job metrics
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 10. Phase 7: Refactor Refinement context to use read models
  - [ ] 10.1 Update RefineContentCommandHandler to use ContentItemReadRepository
    - Remove IContentItemFactory dependency from Ingestion context
    - Query ContentItemReadModel for content data
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 8.1, 8.2, 8.3_

  - [ ] 10.2 Update ContentIngestedEventHandler in Refinement context
    - Use enhanced ContentIngestedEvent with full content data
    - Pass content data directly to RefineContentCommand
    - _Requirements: 1.1, 1.4, 5.4, 7.2_

  - [ ] 10.3 Update RefineContentCommand to accept content data
    - Add normalizedContent and metadata parameters
    - Remove need to query for content data
    - _Requirements: 1.1, 1.4, 8.2_

- [ ]* 10.4 Write property test for cross-context communication via events only
  - **Property 7: Cross-Context Communication via Events Only**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ]* 10.5 Write integration test for refinement event flow
  - Verify ContentIngestedEvent triggers RefineContentCommand
  - Verify content data is passed correctly
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 11. Checkpoint - Verify all contexts are decoupled
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. Phase 8: Remove old dependencies and clean up
  - [ ] 12.1 Remove IContentItemFactory from Refinement context dependencies
    - Remove from module providers
    - Remove from handler constructors
    - _Requirements: 1.1, 1.3, 14.1, 14.2_

  - [ ] 12.2 Remove ISourceConfigurationFactory from Job sub-context dependencies
    - Remove from module providers
    - Remove from handler constructors
    - _Requirements: 1.1, 1.3, 14.1, 14.3_

  - [ ] 12.3 Remove UpdateJobMetricsCommand from Content sub-context dependencies
    - Remove import statements
    - Remove from handler code
    - _Requirements: 2.4, 14.3_

  - [ ] 12.4 Remove IngestContentCommand from Job sub-context dependencies
    - Remove import statements
    - Remove from handler code
    - _Requirements: 2.4, 14.3_

  - [ ] 12.5 Remove UpdateSourceHealthCommand from Job sub-context dependencies
    - Remove import statements
    - Remove from event handlers
    - _Requirements: 2.4, 14.3_

  - [ ] 12.6 Update module configurations to reflect new dependencies
    - Update provider arrays
    - Update import arrays
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 12.7 Write static analysis test to prevent future coupling
  - Verify no imports between bounded contexts
  - Verify no imports between sub-contexts (except shared kernel)
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 13. Phase 9: Add ESLint rules to prevent future coupling
  - [ ] 13.1 Create ESLint rule to prevent cross-context imports
    - Detect imports from other bounded contexts
    - Provide clear error messages
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 13.2 Create ESLint rule to prevent cross-sub-context imports
    - Detect imports between sub-contexts
    - Allow shared kernel imports
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 13.3 Configure ESLint to run on pre-commit hook
    - Add to husky pre-commit
    - Ensure CI/CD runs linting
    - _Requirements: 14.1, 14.5_

  - [ ] 13.4 Document architectural rules in README
    - Explain bounded context boundaries
    - Provide examples of correct patterns
    - List anti-patterns to avoid
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14. Phase 10: Create comprehensive documentation
  - [ ] 14.1 Create event flow diagrams
    - Diagram all event flows between contexts
    - Show which contexts publish and subscribe to each event
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 14.2 Document event-driven patterns
    - Event-carried state transfer
    - Read model updates
    - Event handler → local command pattern
    - _Requirements: 10.1, 10.2, 10.4_

  - [ ] 14.3 Create migration guide for developers
    - How to add new events
    - How to create read models
    - How to implement event handlers
    - _Requirements: 10.1, 10.2, 10.5_

  - [ ] 14.4 Update steering files with new patterns
    - Update 14-event-driven-architecture.md
    - Add examples from this refactoring
    - _Requirements: 10.1, 10.2_

- [ ] 15. Phase 11: End-to-end testing and validation
  - [ ] 15.1 Create E2E test for complete ingestion workflow
    - Configure source → Schedule job → Collect content → Ingest → Refine
    - Verify all events flow correctly
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 15.2 Create E2E test for source health tracking
    - Job completion → Source health update → Read model update
    - Verify health metrics are updated correctly
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 15.3 Create E2E test for job metrics tracking
    - Content ingestion → Job metrics update → Job completion
    - Verify metrics are tracked correctly
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 15.4 Run full test suite and verify all tests pass
    - Unit tests
    - Integration tests
    - Property tests
    - E2E tests
    - _Requirements: All_

- [ ]* 15.5 Write property test for read model consistency
  - **Property 4: Read Model Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 16. Final checkpoint - Complete refactoring validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify zero direct dependencies between contexts
  - Verify all event flows work correctly
  - Verify read models are updated correctly
  - Verify ESLint rules prevent future coupling

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each phase builds on the previous phase
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate event flows between contexts
- E2E tests validate complete workflows
- ESLint rules enforce architectural boundaries at compile time
- Documentation ensures patterns are understood and followed
