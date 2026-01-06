/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem } from '@/ingestion/content/domain/aggregates/content-item';
import { ContentItemWriteRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-write';
import { ConcurrencyException } from '@/shared/kernel';
import { ContentItemEntity } from '../entities/content-item';

/**
 * TypeORM ContentItemWriteRepository Implementation
 *
 * Implements write operations for ContentItem aggregate using TypeORM and PostgreSQL.
 * Uses optimistic locking to prevent concurrent modifications.
 *
 * Requirements: 10.1
 */
@Injectable()
export class TypeOrmContentItemWriteRepository implements ContentItemWriteRepository {
  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly repository: Repository<ContentItemEntity>,
  ) {}

  async save(item: ContentItem): Promise<void> {
    const itemData = item.toObject();
    const entity = this.toEntity(itemData);

    // Check if this is a new aggregate (version = 0)
    if (itemData.version === 0) {
      // Insert new record
      await this.repository.insert(entity);
      return;
    }

    // Update existing record with optimistic locking
    const result = await this.repository
      .createQueryBuilder()
      .update(ContentItemEntity)
      .set({
        sourceId: entity.sourceId,
        contentHash: entity.contentHash,
        rawContent: entity.rawContent,
        normalizedContent: entity.normalizedContent,
        title: entity.title,
        author: entity.author,
        publishedAt: entity.publishedAt,
        language: entity.language,
        sourceUrl: entity.sourceUrl,
        assetTags: entity.assetTags,
        collectedAt: entity.collectedAt,
        version: itemData.version,
        updatedAt: new Date(),
      })
      .where('contentId = :id', { id: itemData.contentId })
      .andWhere('version = :oldVersion', { oldVersion: itemData.version - 1 })
      .execute();

    // If no rows were affected, version mismatch occurred
    if (result.affected === 0) {
      throw new ConcurrencyException(
        `ContentItem ${itemData.contentId} was modified by another transaction. ` +
          `Expected version ${itemData.version - 1}, but it may have changed.`,
      );
    }
  }

  private toEntity(itemData: any): ContentItemEntity {
    const entity = new ContentItemEntity();
    entity.contentId = itemData.contentId;
    entity.sourceId = itemData.sourceId;
    entity.contentHash = itemData.contentHash.toString();
    entity.rawContent = itemData.rawContent;
    entity.normalizedContent = itemData.normalizedContent;
    entity.title = itemData.metadata.title;
    entity.author = itemData.metadata.author;
    entity.publishedAt = itemData.metadata.publishedAt;
    entity.language = itemData.metadata.language;
    entity.sourceUrl = itemData.metadata.sourceUrl;
    entity.assetTags = itemData.assetTags.map((tag: any) => ({
      symbol: tag.symbol,
      confidence: tag.confidence,
    }));
    entity.collectedAt = itemData.collectedAt;
    entity.version = itemData.version;
    return entity;
  }
}
