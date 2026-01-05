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
