/**
 * Shared Kernel - Core domain building blocks
 *
 * This module exports base classes and utilities that are shared across
 * all bounded contexts in the system.
 */
export { ValueObject } from './value-object';
export {
  AggregateRoot,
  AggregateVersion,
  ConcurrencyException,
} from './aggregate';
export type { DomainEvent, EventPublisher } from './domain-event';
export type { IJobScheduler, JobCallback } from './job-scheduler';

// Read Model Infrastructure
export type { ReadModel, IReadModelRepository } from './read-model';

// Event Versioning
export {
  EventVersion,
  EventVersionRegistry,
  EventUpgraderChain,
} from './event-versioning';
export type { VersionedEvent, IEventUpgrader } from './event-versioning';

// Read Model Updaters
export {
  ReadModelUpdater,
  IdempotentReadModelUpdater,
} from './read-model-updater';
