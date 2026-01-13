import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * TypeORM entity for aggregate_snapshots table
 *
 * Represents a persisted snapshot of an aggregate's state at a specific version.
 * Snapshots optimize aggregate reconstitution by reducing the number of events
 * that need to be replayed.
 *
 * Requirements: 3.1, 3.2, 3.5
 */
@Entity('aggregate_snapshots')
@Index('UQ_aggregate_snapshots_aggregate_version', ['aggregateId', 'version'], {
  unique: true,
})
@Index('IDX_aggregate_snapshots_aggregate', ['aggregateId', 'aggregateType'])
export class AggregateSnapshotEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: number;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 255 })
  aggregateId!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType!: string;

  @Column({ name: 'version', type: 'int' })
  version!: number;

  @Column({ name: 'state', type: 'jsonb' })
  state!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
