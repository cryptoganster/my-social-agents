import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

/**
 * TypeORM entity for ContentItemReadModel
 * Denormalized read model for efficient cross-context queries
 */
@Entity('content_item_read_model')
export class ContentItemReadModelEntity {
  @PrimaryColumn({ name: 'content_id', type: 'varchar', length: 255 })
  contentId!: string;

  @Column({ name: 'source_id', type: 'varchar', length: 255 })
  @Index('idx_content_item_read_model_source_id')
  sourceId!: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, unique: true })
  @Index('idx_content_item_read_model_content_hash')
  contentHash!: string;

  @Column({ name: 'normalized_content', type: 'text' })
  normalizedContent!: string;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata!: {
    title?: string;
    author?: string;
    publishedAt?: Date;
    language?: string;
    sourceUrl?: string;
  };

  @Column({ name: 'asset_tags', type: 'text', array: true })
  assetTags!: string[];

  @Column({ name: 'collected_at', type: 'timestamp' })
  @Index('idx_content_item_read_model_collected_at')
  collectedAt!: Date;
}
