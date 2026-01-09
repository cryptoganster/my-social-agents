# Design Document: Decouple Bounded Contexts

## Overview

This design document provides a comprehensive solution for eliminating all direct dependencies between bounded contexts and sub-contexts in the system. The refactoring will transform the architecture from a tightly-coupled design to a pure event-driven architecture where all cross-context communication happens through domain events.

### Current Problems

1. **Refinement → Ingestion coupling**: RefineContentCommandHandler injects IContentItemFactory from Ingestion context
2. **Content → Job coupling**: ContentIngestedEventHandler executes UpdateJobMetricsCommand from Job sub-context
3. **Job → Source coupling**: ScheduleJobCommandHandler injects ISourceConfigurationFactory and executes queries from Source sub-context
4. **Content → Source coupling**: IngestContentCommandHandler injects ISourceConfigurationFactory and AdapterRegistry from Source sub-context
5. **Job → Content coupling**: ExecuteIngestionJobCommandHandler executes IngestContentCommand from Content sub-context
6. **Job → Source coupling**: JobCompletedEventHandler and JobFailedEventHandler execute UpdateSourceHealthCommand from Source sub-context

### Solution Approach

The solution follows these principles:

1. **Event-Carried State Transfer**: Events carry all data subscribers need
2. **Read Models**: Contexts query read models instead of calling factories
3. **Event Handlers**: All cross-context communication through event handlers
4. **Local Commands**: Event handlers trigger commands within their own context
5. **Shared Kernel**: Common utilities in shared modules, not cross-context dependencies


## Architecture

### Event-Driven Communication Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     BOUNDED CONTEXT: INGESTION                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   SOURCE     │      │     JOB      │      │   CONTENT    │  │
│  │ Sub-Context  │      │ Sub-Context  │      │ Sub-Context  │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │ Events               │ Events               │ Events   │
│         ▼                      ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              INGESTION EVENT BUS                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                │ Cross-Context Events
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BOUNDED CONTEXT: REFINEMENT                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Event Handler: ContentIngestedEvent               │  │
│  │                        ▼                                   │  │
│  │         Command: RefineContentCommand                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Read Model Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        WRITE SIDE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Source Sub-Context                                              │
│  ┌──────────────────┐                                           │
│  │ SourceConfiguration │ ──publish──> SourceConfiguredEvent     │
│  │    (Aggregate)      │                                         │
│  └──────────────────┘                                           │
│                                                                   │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                │ Event
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        READ SIDE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Event Handler: SourceConfiguredEventHandler              │  │
│  │         ▼                                                  │  │
│  │  Update SourceReadModel                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SourceReadModel (Denormalized)                           │  │
│  │  - sourceId                                                │  │
│  │  - sourceType                                              │  │
│  │  - name                                                    │  │
│  │  - isActive                                                │  │
│  │  - healthMetrics                                           │  │
│  │  - config (summary)                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Queried by: Job Sub-Context, Content Sub-Context               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### New Domain Events

#### 1. SourceConfiguredEvent (Source Sub-Context)

```typescript
export class SourceConfiguredEvent {
  constructor(
    public readonly sourceId: string,
    public readonly sourceType: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly configSummary: Record<string, any>,
    public readonly occurredAt: Date,
  ) {}
}
```

**Published by**: ConfigureSourceCommandHandler  
**Subscribed by**: SourceReadModelUpdater (in Job and Content sub-contexts)

#### 2. SourceHealthUpdatedEvent (Source Sub-Context)

```typescript
export class SourceHealthUpdatedEvent {
  constructor(
    public readonly sourceId: string,
    public readonly healthMetrics: {
      consecutiveFailures: number;
      successRate: number;
      lastSuccessAt: Date | null;
      lastFailureAt: Date | null;
    },
    public readonly occurredAt: Date,
  ) {}
}
```

**Published by**: UpdateSourceHealthCommandHandler  
**Subscribed by**: SourceReadModelUpdater

#### 3. ContentCollectionRequestedEvent (Job Sub-Context)

```typescript
export class ContentCollectionRequestedEvent {
  constructor(
    public readonly jobId: string,
    public readonly sourceId: string,
    public readonly sourceType: string,
    public readonly sourceConfig: Record<string, any>,
    public readonly occurredAt: Date,
  ) {}
}
```

**Published by**: ExecuteIngestionJobCommandHandler  
**Subscribed by**: ContentCollectionEventHandler (in Content sub-context)

#### 4. Enhanced ContentIngestedEvent

```typescript
export class ContentIngestedEvent {
  constructor(
    public readonly contentId: string,
    public readonly sourceId: string,
    public readonly jobId: string,
    public readonly contentHash: string,
    public readonly normalizedContent: string, // NEW: Full content
    public readonly metadata: {              // NEW: Full metadata
      title?: string;
      author?: string;
      publishedAt?: Date;
      language?: string;
      sourceUrl?: string;
    },
    public readonly assetTags: string[],
    public readonly collectedAt: Date,
  ) {}
}
```

**Published by**: ContentCollectedEventHandler  
**Subscribed by**: 
- UpdateJobMetricsEventHandler (in Job sub-context)
- ContentIngestedEventHandler (in Refinement context)

#### 5. JobMetricsUpdateRequestedEvent (Content Sub-Context)

```typescript
export class JobMetricsUpdateRequestedEvent {
  constructor(
    public readonly jobId: string,
    public readonly metricsUpdate: {
      itemsPersisted?: number;
      duplicatesDetected?: number;
      validationErrors?: number;
    },
    public readonly occurredAt: Date,
  ) {}
}
```

**Published by**: ContentCollectedEventHandler  
**Subscribed by**: UpdateJobMetricsEventHandler (in Job sub-context)


### Read Models

#### 1. SourceReadModel

```typescript
export interface SourceReadModel {
  sourceId: string;
  sourceType: string;
  name: string;
  isActive: boolean;
  healthMetrics: {
    consecutiveFailures: number;
    successRate: number;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
  };
  configSummary: Record<string, any>;
  updatedAt: Date;
}
```

**Location**: `apps/backend/src/ingestion/shared/read-models/source-read-model.ts`  
**Updated by**: SourceConfiguredEvent, SourceHealthUpdatedEvent  
**Queried by**: Job sub-context, Content sub-context

#### 2. ContentItemReadModel

```typescript
export interface ContentItemReadModel {
  contentId: string;
  sourceId: string;
  contentHash: string;
  normalizedContent: string;
  metadata: {
    title?: string;
    author?: string;
    publishedAt?: Date;
    language?: string;
    sourceUrl?: string;
  };
  assetTags: string[];
  collectedAt: Date;
}
```

**Location**: `apps/backend/src/ingestion/shared/read-models/content-item-read-model.ts`  
**Updated by**: ContentIngestedEvent  
**Queried by**: Refinement context

### Read Repositories

#### 1. ISourceReadRepository

```typescript
export interface ISourceReadRepository {
  findById(sourceId: string): Promise<SourceReadModel | null>;
  findByType(sourceType: string): Promise<SourceReadModel[]>;
  findActive(): Promise<SourceReadModel[]>;
}
```

**Implementation**: `TypeOrmSourceReadRepository`  
**Used by**: Job sub-context, Content sub-context

#### 2. IContentItemReadRepository

```typescript
export interface IContentItemReadRepository {
  findById(contentId: string): Promise<ContentItemReadModel | null>;
  findByHash(contentHash: string): Promise<ContentItemReadModel | null>;
  findBySourceId(sourceId: string): Promise<ContentItemReadModel[]>;
}
```

**Implementation**: `TypeOrmContentItemReadRepository`  
**Used by**: Refinement context


## Data Models

### Event Payload Structures

All events follow event-carried state transfer pattern, including complete data needed by subscribers.

#### SourceConfiguredEvent Payload

```json
{
  "sourceId": "uuid-123",
  "sourceType": "WEB_SCRAPER",
  "name": "CoinDesk News",
  "isActive": true,
  "configSummary": {
    "url": "https://coindesk.com",
    "selectors": { "title": "h1", "content": ".article-body" }
  },
  "occurredAt": "2025-01-09T10:00:00Z"
}
```

#### ContentIngestedEvent Payload (Enhanced)

```json
{
  "contentId": "content-uuid-456",
  "sourceId": "uuid-123",
  "jobId": "job-uuid-789",
  "contentHash": "abc123...",
  "normalizedContent": "Full article text here...",
  "metadata": {
    "title": "Bitcoin Reaches New High",
    "author": "John Doe",
    "publishedAt": "2025-01-09T09:00:00Z",
    "language": "en",
    "sourceUrl": "https://coindesk.com/article/123"
  },
  "assetTags": ["BTC", "ETH"],
  "collectedAt": "2025-01-09T10:00:00Z"
}
```

### Read Model Database Schema

#### source_read_model Table

```sql
CREATE TABLE source_read_model (
  source_id VARCHAR(255) PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL,
  consecutive_failures INT NOT NULL DEFAULT 0,
  success_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_success_at TIMESTAMP NULL,
  last_failure_at TIMESTAMP NULL,
  config_summary JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_source_type (source_type),
  INDEX idx_is_active (is_active)
);
```

#### content_item_read_model Table

```sql
CREATE TABLE content_item_read_model (
  content_id VARCHAR(255) PRIMARY KEY,
  source_id VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  normalized_content TEXT NOT NULL,
  metadata JSONB NOT NULL,
  asset_tags TEXT[] NOT NULL,
  collected_at TIMESTAMP NOT NULL,
  INDEX idx_source_id (source_id),
  INDEX idx_content_hash (content_hash),
  INDEX idx_collected_at (collected_at)
);
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Event-Carried State Completeness

*For any* domain event published across context boundaries, the event SHALL contain all data that subscribers need to process the event without querying the publishing context.

**Validates: Requirements 1.1, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 2: No Direct Cross-Context Dependencies

*For any* command handler in a bounded context, the handler SHALL NOT inject interfaces or services from another bounded context's domain or application layers.

**Validates: Requirements 1.1, 1.2, 1.3, 2.4, 8.1, 8.2, 8.3, 8.4, 14.1, 14.2, 14.3**

### Property 3: Event Handler Triggers Local Commands

*For any* event handler that responds to a cross-context event, the handler SHALL execute a command within its own bounded context rather than directly calling services from other contexts.

**Validates: Requirements 2.1, 2.2, 2.3, 2.5, 7.1, 7.2, 7.3, 7.4**

### Property 4: Read Model Consistency

*For any* domain event that updates a read model, the read model SHALL eventually reflect the state described in the event within 1 second.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 5: Event Handler Idempotency

*For any* event handler, processing the same event multiple times SHALL produce the same result and SHALL NOT cause duplicate side effects.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

### Property 6: Error Isolation in Event Handlers

*For any* event handler, when an error occurs during event processing, the handler SHALL log the error and SHALL NOT rethrow the exception, allowing other event handlers to continue processing.

**Validates: Requirements 7.5**

### Property 7: Cross-Context Communication via Events Only

*For any* interaction between bounded contexts or sub-contexts, the interaction SHALL occur through domain events published to the event bus, not through direct method calls or dependency injection.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 8: Read Model Query Independence

*For any* query to a read model, the query SHALL NOT trigger any writes or side effects in the system.

**Validates: Requirements 3.1, 3.2, 3.3, 6.1, 6.2, 6.3**

### Property 9: Event Version Compatibility

*For any* event handler, the handler SHALL gracefully handle multiple versions of the same event type without failing.

**Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

### Property 10: Shared Kernel Isolation

*For any* shared kernel module, the module SHALL contain only pure utilities and value objects, and SHALL NOT contain business logic specific to any bounded context.

**Validates: Requirements 4.4**


## Error Handling

### Event Handler Error Isolation

All event handlers MUST implement error isolation pattern:

```typescript
@EventsHandler(SomeEvent)
export class SomeEventHandler implements IEventHandler<SomeEvent> {
  private readonly logger = new Logger(SomeEventHandler.name);

  async handle(event: SomeEvent): Promise<void> {
    try {
      // Event processing logic
      await this.processEvent(event);
    } catch (error) {
      // Error isolation: log but don't rethrow
      this.logger.error(
        `Error processing ${SomeEvent.name}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      // Don't throw - allows other handlers to continue
    }
  }
}
```

### Read Model Update Failures

When read model updates fail:

1. **Log the error** with full context
2. **Don't block event processing** - other handlers continue
3. **Implement retry logic** for transient failures
4. **Alert on persistent failures** - read model may be stale

### Event Publishing Failures

When event publishing fails:

1. **Log the error** with event details
2. **Retry with exponential backoff** (3 attempts)
3. **Store failed events** in dead letter queue
4. **Alert on persistent failures** - manual intervention needed

### Cross-Context Communication Failures

When cross-context communication fails:

1. **Event not received**: Subscriber context continues independently
2. **Event processing fails**: Error isolation prevents cascade failures
3. **Read model stale**: Queries may return outdated data (eventual consistency)
4. **Compensating actions**: Sagas handle multi-step workflow failures


## Testing Strategy

### Unit Testing

**Command Handlers**:
- Test with mocked repositories and services from same context only
- Verify events are published with correct data
- Test business logic without cross-context dependencies

**Event Handlers**:
- Test with mocked command bus
- Verify correct command is triggered
- Test error isolation (errors logged, not rethrown)
- Test idempotency

**Read Model Updaters**:
- Test with mocked read repositories
- Verify read model is updated correctly from events
- Test handling of multiple event versions

### Integration Testing

**Event Flow Tests**:
```typescript
describe('Content Ingestion Event Flow', () => {
  it('should trigger refinement when content is ingested', async () => {
    // Arrange
    const event = new ContentIngestedEvent(/* ... */);
    
    // Act
    await eventBus.publish(event);
    await waitForEventProcessing();
    
    // Assert
    expect(refinementCommandHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        contentItemId: event.contentId,
      })
    );
  });
});
```

**Read Model Tests**:
```typescript
describe('SourceReadModel', () => {
  it('should be updated when source is configured', async () => {
    // Arrange
    const event = new SourceConfiguredEvent(/* ... */);
    
    // Act
    await eventBus.publish(event);
    await waitForEventProcessing();
    
    // Assert
    const readModel = await sourceReadRepo.findById(event.sourceId);
    expect(readModel).toMatchObject({
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      name: event.name,
    });
  });
});
```

### Property-Based Testing

**Property 1: Event-Carried State Completeness**
```typescript
describe('Event-Carried State Transfer', () => {
  it('should include all necessary data in events', () => {
    fc.assert(
      fc.property(
        fc.record({
          contentId: fc.uuid(),
          sourceId: fc.uuid(),
          normalizedContent: fc.string({ minLength: 100 }),
          metadata: fc.record({
            title: fc.option(fc.string()),
            author: fc.option(fc.string()),
          }),
        }),
        (data) => {
          const event = new ContentIngestedEvent(/* ... */);
          
          // Event should contain all data needed by subscribers
          expect(event.normalizedContent).toBeDefined();
          expect(event.metadata).toBeDefined();
          expect(event.assetTags).toBeDefined();
        }
      )
    );
  });
});
```

**Property 2: No Direct Cross-Context Dependencies**
```typescript
describe('Context Boundaries', () => {
  it('should not have direct dependencies between contexts', () => {
    // Static analysis test
    const refinementHandlers = getAllHandlersInContext('refinement');
    
    refinementHandlers.forEach(handler => {
      const dependencies = getInjectedDependencies(handler);
      
      dependencies.forEach(dep => {
        // Should not inject from ingestion context
        expect(dep.module).not.toMatch(/^@\/ingestion/);
      });
    });
  });
});
```

### End-to-End Testing

**Complete Workflow Test**:
```typescript
describe('Content Ingestion to Refinement Workflow', () => {
  it('should process content from ingestion through refinement', async () => {
    // 1. Configure source
    await configureSource({ sourceType: 'WEB_SCRAPER', /* ... */ });
    
    // 2. Schedule job
    const { jobId } = await scheduleJob({ sourceId });
    
    // 3. Wait for job execution
    await waitForJobCompletion(jobId);
    
    // 4. Verify content was ingested
    const content = await getContentByJobId(jobId);
    expect(content).toHaveLength(greaterThan(0));
    
    // 5. Verify refinement was triggered
    const refinements = await getRefinementsByContentId(content[0].contentId);
    expect(refinements).toHaveLength(1);
    expect(refinements[0].status).toBe('completed');
  });
});
```

### Test Configuration

**Minimum Test Coverage**:
- Unit tests: 80% code coverage
- Integration tests: All event flows covered
- Property tests: 100 iterations per property
- E2E tests: Critical workflows covered

**Test Execution**:
- Unit tests: Run on every commit
- Integration tests: Run on every PR
- Property tests: Run nightly
- E2E tests: Run before release

