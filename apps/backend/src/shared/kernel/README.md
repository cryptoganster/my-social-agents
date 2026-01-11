# Shared Kernel - Event-Driven Architecture Infrastructure

This directory contains the shared infrastructure for implementing event-driven architecture across all bounded contexts.

## Overview

The shared kernel provides:

1. **Read Model Infrastructure** - Base interfaces and patterns for read models
2. **Read Model Updaters** - Base classes for event handlers that update read models
3. **Event Versioning** - Utilities for versioning domain events and handling schema evolution

## Components

### Read Models

Read models are denormalized, query-optimized data structures that are updated asynchronously by domain events.

#### ReadModel Interface

```typescript
export interface ReadModel {
  id: string;
  updatedAt: Date;
  version: number;
}
```

All read models must implement this interface, which provides:

- **id**: Unique identifier
- **updatedAt**: Timestamp of last update
- **version**: Version number for optimistic locking

#### IReadModelRepository Interface

```typescript
export interface IReadModelRepository<T extends ReadModel> {
  findById(id: string): Promise<T | null>;
  save(model: T): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
```

Base interface for read model repositories with common query operations.

### Read Model Updaters

Base classes for event handlers that update read models.

#### ReadModelUpdater

Abstract base class providing:

- Error isolation (log errors but don't rethrow)
- Logging and observability
- Template method pattern for update logic

**Usage Example:**

```typescript
@EventsHandler(SourceConfiguredEvent)
export class UpdateSourceReadModelOnSourceConfigured
  extends ReadModelUpdater<SourceConfiguredEvent, SourceConfigurationReadModel>
  implements IEventHandler<SourceConfiguredEvent>
{
  constructor(
    @Inject('ISourceConfigurationReadRepository')
    repository: IReadModelRepository<SourceConfigurationReadModel>,
  ) {
    super(repository, 'UpdateSourceReadModelOnSourceConfigured');
  }

  protected async updateReadModel(event: SourceConfiguredEvent): Promise<void> {
    const existing = await this.repository.findById(event.sourceId);

    const readModel: SourceConfigurationReadModel = {
      sourceId: event.sourceId,
      sourceType: event.sourceType,
      name: event.name,
      isActive: event.isActive,
      config: event.config,
      updatedAt: event.occurredAt,
      version: existing ? existing.version + 1 : 1,
    };

    await this.repository.save(readModel);
  }
}
```

#### IdempotentReadModelUpdater

Extended base class that adds idempotency checking:

- Tracks processed event IDs
- Checks if read model was updated after event occurred
- Prevents duplicate processing

**Usage Example:**

```typescript
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler
  extends IdempotentReadModelUpdater<ContentIngestedEvent, ContentItemReadModel>
  implements IEventHandler<ContentIngestedEvent>
{
  constructor(
    @Inject('IContentItemReadRepository')
    repository: IReadModelRepository<ContentItemReadModel>,
  ) {
    super(repository, 'ContentIngestedEventHandler');
  }

  protected async doUpdateReadModel(
    event: ContentIngestedEvent,
  ): Promise<void> {
    const readModel: ContentItemReadModel = {
      id: event.contentId,
      sourceId: event.sourceId,
      contentHash: event.contentHash,
      normalizedContent: event.normalizedContent,
      metadata: event.metadata,
      assetTags: event.assetTags,
      collectedAt: event.collectedAt,
      updatedAt: event.occurredAt,
      version: 1,
    };

    await this.repository.save(readModel);
  }
}
```

### Event Versioning

Utilities for versioning domain events and handling schema evolution.

#### VersionedEvent Interface

```typescript
export interface VersionedEvent {
  eventVersion: string; // e.g., "1.0", "2.0"
  eventType: string;
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
}
```

All domain events should implement this interface to support versioning.

#### EventVersion

Value object representing an event schema version with major and minor components.

**Usage:**

```typescript
// Parse version string
const version = EventVersion.parse('1.0');

// Create initial version
const initial = EventVersion.initial(); // 1.0

// Increment versions
const v2 = version.incrementMajor(); // 2.0
const v1_1 = version.incrementMinor(); // 1.1

// Compare versions
version.isCompatibleWith(v1_1); // true (same major)
version.isNewerThan(initial); // false
version.equals(EventVersion.parse('1.0')); // true
```

#### EventVersionRegistry

Registry for tracking supported event versions.

**Usage:**

```typescript
const registry = new EventVersionRegistry();

// Register supported versions
registry.registerVersion('ContentIngested', '1.0');
registry.registerVersion('ContentIngested', '1.1');
registry.registerVersion('ContentIngested', '2.0');

// Check support
registry.isVersionSupported('ContentIngested', '1.0'); // true

// Get versions
registry.getSupportedVersions('ContentIngested'); // ['1.0', '1.1', '2.0']
registry.getLatestVersion('ContentIngested'); // '2.0'
```

#### Event Upgraders

Interfaces and utilities for upgrading events from old versions to new versions.

**IEventUpgrader Interface:**

```typescript
export interface IEventUpgrader<TOld, TNew> {
  fromVersion: string;
  toVersion: string;
  upgrade(oldEvent: TOld): TNew;
}
```

**Example Upgrader:**

```typescript
class ContentIngestedV1ToV2Upgrader implements IEventUpgrader<
  ContentIngestedEventV1,
  ContentIngestedEventV2
> {
  fromVersion = '1.0';
  toVersion = '2.0';

  upgrade(oldEvent: ContentIngestedEventV1): ContentIngestedEventV2 {
    return {
      ...oldEvent,
      eventVersion: '2.0',
      // Add new fields with defaults
      normalizedContent: oldEvent.content,
      metadata: {
        title: oldEvent.title,
        author: null,
        publishedAt: oldEvent.collectedAt,
      },
    };
  }
}
```

**EventUpgraderChain:**

Chains multiple upgraders to upgrade events across multiple versions.

```typescript
const chain = new EventUpgraderChain();
chain.addUpgrader(new V1ToV2Upgrader());
chain.addUpgrader(new V2ToV3Upgrader());

// Upgrade from v1.0 to v3.0
const upgradedEvent = chain.upgrade(oldEvent, '1.0', '3.0');
```

## Best Practices

### Read Models

1. **Denormalize for queries** - Read models should be optimized for specific query patterns
2. **Update asynchronously** - Read models are updated by event handlers, not directly
3. **Version for consistency** - Use version field for optimistic locking
4. **Keep simple** - Read models are pure data, no business logic

### Read Model Updaters

1. **Error isolation** - Always catch errors and log them (don't rethrow)
2. **Idempotency** - Use `IdempotentReadModelUpdater` when duplicate events are possible
3. **Logging** - Log event processing for observability
4. **Keep focused** - Each updater should update one read model type

### Event Versioning

1. **Always version events** - Include `eventVersion` field in all events
2. **Backward compatibility** - New versions should be backward compatible when possible
3. **Major vs Minor** - Use major version for breaking changes, minor for additions
4. **Support old versions** - Event handlers should handle multiple versions gracefully
5. **Upgrade chains** - Use upgrader chains for multi-version upgrades

## Event Versioning Strategy

### Version Format

Events use semantic versioning with format `major.minor`:

- **Major version**: Breaking changes (e.g., removing fields, changing types)
- **Minor version**: Backward-compatible additions (e.g., adding optional fields)

### Version Evolution Example

**Version 1.0:**

```typescript
interface ContentIngestedEventV1 {
  eventVersion: '1.0';
  eventType: 'ContentIngested';
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
  contentId: string;
  sourceId: string;
  contentHash: string;
}
```

**Version 2.0 (backward-compatible addition):**

```typescript
interface ContentIngestedEventV2 {
  eventVersion: '2.0';
  eventType: 'ContentIngested';
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
  contentId: string;
  sourceId: string;
  contentHash: string;
  normalizedContent: string; // NEW: Added field
  metadata: ContentMetadata; // NEW: Added field
}
```

### Handling Multiple Versions

Event handlers should handle multiple versions:

```typescript
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler {
  async handle(event: ContentIngestedEvent): Promise<void> {
    const version = EventVersion.parse(event.eventVersion);

    if (version.getMajor() === 1) {
      // Handle v1.x events
      await this.handleV1(event as ContentIngestedEventV1);
    } else if (version.getMajor() === 2) {
      // Handle v2.x events
      await this.handleV2(event as ContentIngestedEventV2);
    } else {
      throw new Error(`Unsupported event version: ${event.eventVersion}`);
    }
  }
}
```

Or use upgraders to normalize to latest version:

```typescript
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler {
  private upgraderChain: EventUpgraderChain<ContentIngestedEvent>;

  constructor() {
    this.upgraderChain = new EventUpgraderChain();
    this.upgraderChain.addUpgrader(new V1ToV2Upgrader());
  }

  async handle(event: ContentIngestedEvent): Promise<void> {
    // Upgrade to latest version
    const latestEvent = this.upgraderChain.upgrade(
      event,
      event.eventVersion,
      '2.0',
    ) as ContentIngestedEventV2;

    // Process latest version
    await this.processEvent(latestEvent);
  }
}
```

## Testing

All components include comprehensive unit tests:

- `__tests__/event-versioning.spec.ts` - Event versioning utilities
- `__tests__/read-model-updater.spec.ts` - Read model updater base classes

Run tests:

```bash
npm test -- shared/kernel/__tests__
```

## Related Documentation

- [Clean Architecture](../../../docs/10-clean-architecture.md)
- [DDD Fundamentals](../../../docs/11-ddd-fundamentals.md)
- [CQRS Patterns](../../../docs/12-cqrs-patterns.md)
- [Event-Driven Architecture](../../../docs/14-event-driven-architecture.md)
