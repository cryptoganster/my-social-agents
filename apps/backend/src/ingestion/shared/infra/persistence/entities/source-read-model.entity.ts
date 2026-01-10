import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

/**
 * TypeORM entity for SourceReadModel
 * Denormalized read model for efficient cross-context queries
 */
@Entity('source_read_model')
export class SourceReadModelEntity {
  @PrimaryColumn({ name: 'source_id', type: 'varchar', length: 255 })
  sourceId!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  @Index('idx_source_read_model_type')
  sourceType!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean' })
  @Index('idx_source_read_model_active')
  isActive!: boolean;

  @Column({ name: 'consecutive_failures', type: 'int', default: 0 })
  consecutiveFailures!: number;

  @Column({
    name: 'success_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  successRate!: number;

  @Column({ name: 'last_success_at', type: 'timestamp', nullable: true })
  lastSuccessAt!: Date | null;

  @Column({ name: 'last_failure_at', type: 'timestamp', nullable: true })
  lastFailureAt!: Date | null;

  @Column({ name: 'config_summary', type: 'jsonb' })
  configSummary!: Record<string, any>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  @Index('idx_source_read_model_updated_at')
  updatedAt!: Date;
}
