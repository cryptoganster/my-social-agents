import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * IngestionJob Database Entity
 *
 * TypeORM entity for persisting IngestionJob aggregates.
 * Maps the aggregate to a relational database schema.
 */
@Entity('ingestion_jobs')
export class IngestionJobEntity {
  @PrimaryColumn('varchar', { length: 255, name: 'job_id' })
  jobId!: string;

  @Column('varchar', { length: 255, name: 'source_id' })
  sourceId!: string;

  @Column('varchar', { length: 50 })
  status!: string;

  @Column('timestamp', { name: 'scheduled_at' })
  scheduledAt!: Date;

  @Column('timestamp', { nullable: true, name: 'executed_at' })
  executedAt!: Date | null;

  @Column('timestamp', { nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  // Metrics (flattened)
  @Column('integer', { default: 0, name: 'items_collected' })
  itemsCollected!: number;

  @Column('integer', { default: 0, name: 'duplicates_detected' })
  duplicatesDetected!: number;

  @Column('integer', { default: 0, name: 'errors_encountered' })
  errorsEncountered!: number;

  @Column('bigint', { default: 0, name: 'bytes_processed' })
  bytesProcessed!: number;

  @Column('integer', { default: 0, name: 'duration_ms' })
  durationMs!: number;

  // Errors stored as JSON
  @Column('jsonb', { default: [] })
  errors!: Array<{
    errorId: string;
    timestamp: Date;
    errorType: string;
    message: string;
    stackTrace: string | null;
    retryCount: number;
  }>;

  // Source configuration stored as JSON
  @Column('jsonb', { name: 'source_config' })
  sourceConfig!: {
    sourceId: string;
    sourceType: string;
    name: string;
    config: Record<string, unknown>;
    credentials?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  // Version for optimistic locking
  @Column('integer', { default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
