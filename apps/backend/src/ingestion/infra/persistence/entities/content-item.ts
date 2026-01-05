import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ContentItem Database Entity
 *
 * TypeORM entity for persisting ContentItem aggregates.
 * Maps the aggregate to a relational database schema.
 */
@Entity('content_items')
@Index('idx_content_hash', ['contentHash'])
@Index('idx_source_id', ['sourceId'])
export class ContentItemEntity {
  @PrimaryColumn('varchar', { length: 255 })
  contentId!: string;

  @Column('varchar', { length: 255 })
  sourceId!: string;

  @Column('varchar', { length: 64 })
  contentHash!: string;

  @Column('text')
  rawContent!: string;

  @Column('text')
  normalizedContent!: string;

  // Metadata (flattened)
  @Column('varchar', { length: 500, nullable: true })
  title!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  author!: string | null;

  @Column('timestamp', { nullable: true })
  publishedAt!: Date | null;

  @Column('varchar', { length: 10, nullable: true })
  language!: string | null;

  @Column('varchar', { length: 1000, nullable: true })
  sourceUrl!: string | null;

  // Asset tags stored as JSON
  @Column('jsonb', { default: [] })
  assetTags!: Array<{
    symbol: string;
    confidence: number;
  }>;

  @Column('timestamp')
  collectedAt!: Date;

  // Version for optimistic locking
  @Column('integer', { default: 0 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
