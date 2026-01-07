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
  @PrimaryColumn('varchar', { length: 255, name: 'content_id' })
  contentId!: string;

  @Column('varchar', { length: 255, name: 'source_id' })
  sourceId!: string;

  @Column('varchar', { length: 64, name: 'content_hash' })
  contentHash!: string;

  @Column('text', { name: 'raw_content' })
  rawContent!: string;

  @Column('text', { name: 'normalized_content' })
  normalizedContent!: string;

  // Metadata (flattened)
  @Column('varchar', { length: 500, nullable: true })
  title!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  author!: string | null;

  @Column('timestamp', { nullable: true, name: 'published_at' })
  publishedAt!: Date | null;

  @Column('varchar', { length: 10, nullable: true })
  language!: string | null;

  @Column('varchar', { length: 1000, nullable: true, name: 'source_url' })
  sourceUrl!: string | null;

  // Asset tags stored as JSON
  @Column('jsonb', { default: [], name: 'asset_tags' })
  assetTags!: Array<{
    symbol: string;
    confidence: number;
  }>;

  @Column('timestamp', { name: 'collected_at' })
  collectedAt!: Date;

  // Version for optimistic locking
  @Column('integer', { default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
