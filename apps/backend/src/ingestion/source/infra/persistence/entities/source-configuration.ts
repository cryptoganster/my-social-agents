import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * SourceConfiguration Database Entity
 *
 * TypeORM entity for persisting SourceConfiguration aggregates.
 * Maps the aggregate to a relational database schema.
 */
@Entity('source_configurations')
export class SourceConfigurationEntity {
  @PrimaryColumn('varchar', { length: 255, name: 'source_id' })
  sourceId!: string;

  @Column('varchar', { length: 50, name: 'source_type' })
  sourceType!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('jsonb')
  config!: Record<string, unknown>;

  @Column('text', { nullable: true, name: 'encrypted_credentials' })
  credentials!: string | undefined;

  @Column('boolean', { default: true, name: 'is_active' })
  isActive!: boolean;

  // Health tracking fields
  @Column('integer', { default: 0, name: 'consecutive_failures' })
  consecutiveFailures!: number;

  @Column('float', { default: 100.0, name: 'success_rate' })
  successRate!: number;

  @Column('integer', { default: 0, name: 'total_jobs' })
  totalJobs!: number;

  @Column('timestamp', { nullable: true, name: 'last_success_at' })
  lastSuccessAt!: Date | null;

  @Column('timestamp', { nullable: true, name: 'last_failure_at' })
  lastFailureAt!: Date | null;

  // Version for optimistic locking
  @Column('integer', { default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
