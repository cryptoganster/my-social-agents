/**
 * EventPublisher Interface
 *
 * Re-export of the shared EventPublisher interface from the kernel.
 * This maintains backward compatibility for the ingestion bounded context.
 *
 * Requirements: 10.2
 */
export type { DomainEvent, EventPublisher } from '@/shared/kernel';
