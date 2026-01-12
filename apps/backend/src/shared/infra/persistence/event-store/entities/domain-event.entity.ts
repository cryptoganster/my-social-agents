import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * TypeORM entity for domain_events table
 *
 * Represents a persisted domain event in the Event Store.
 * Events are append-only and immutable once persisted.
 */
@Entity('domain_events')
@Index('UQ_domain_events_aggregate_version', ['aggregateId', 'version'], {
  unique: true,
})
@Index('UQ_domain_events_idempotency_key', ['idempotencyKey'], {
  unique: true,
  where: 'idempotency_key IS NOT NULL',
})
@Index('IDX_domain_events_aggregate_id', ['aggregateId'])
@Index('IDX_domain_events_aggregate_type', ['aggregateType'])
@Index('IDX_domain_events_event_type', ['eventType'])
@Index('IDX_domain_events_timestamp', ['timestamp'])
@Index('IDX_domain_events_global_sequence', ['globalSequence'])
export class DomainEventEntity {
  @PrimaryGeneratedColumn({ name: 'global_sequence', type: 'bigint' })
  globalSequence!: number;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 255 })
  aggregateId!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData!: Record<string, unknown>;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'version', type: 'int' })
  version!: number;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion!: number;

  @Column({ name: 'timestamp', type: 'timestamptz', default: () => 'NOW()' })
  timestamp!: Date;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  idempotencyKey?: string;
}
