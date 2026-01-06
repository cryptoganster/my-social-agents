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
  @PrimaryColumn('varchar', { length: 255 })
  jobId!: string;

  @Column('varchar', { length: 255 })
  sourceId!: string;

  @Column('varchar', { length: 50 })
  status!: string;

  @Column('timestamp')
  scheduledAt!: Date;

  @Column('timestamp', { nullable: true })
  executedAt!: Date | null;

  @Column('timestamp', { nullable: true })
  completedAt!: Date | null;

  // Metrics (flattened)
  @Column('integer', { default: 0 })
  itemsCollected!: number;

  @Column('integer', { default: 0 })
  duplicatesDetected!: number;

  @Column('integer', { default: 0 })
  errorsEncountered!: number;

  @Column('bigint', { default: 0 })
  bytesProcessed!: number;

  @Column('integer', { default: 0 })
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
  @Column('jsonb')
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
