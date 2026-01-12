/**
 * Event Sourcing Module
 *
 * Core interfaces and base classes for event sourcing.
 * This module provides the foundation for event-sourced aggregates.
 */

// Event Store
export type {
  IEventStore,
  StoredEvent,
  EventMetadata,
  AppendOptions,
  StreamQuery,
  GlobalQuery,
  Subscription,
  DomainEvent,
} from './event-store';

// Snapshot Store
export type { ISnapshotStore, Snapshot } from './snapshot-store';

// Event-Sourced Aggregate
export { EventSourcedAggregate } from './event-sourced-aggregate';

// Event-Sourced Repository
export type { IEventSourcedRepository } from './event-sourced-repository';
