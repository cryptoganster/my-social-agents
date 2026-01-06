import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItemReadModel } from '@/ingestion/content/domain/read-models/content-item';
import { ContentItemReadRepository } from '@/ingestion/content/domain/interfaces/repositories/content-item-read';
import { ContentHash } from '@/ingestion/content/domain/value-objects/content-hash';
import { ContentItemEntity } from '../entities/content-item';

/**
 * TypeORM ContentItemReadRepository Implementation
 *
 * Implements read operations for querying content items using TypeORM and PostgreSQL.
 * Returns read models (plain objects) optimized for queries.
 * Includes hash indexing for efficient duplicate detection.
 *
 * Requirements: 3.2
 */
@Injectable()
export class TypeOrmContentItemReadRepository implements ContentItemReadRepository {
  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly repository: Repository<ContentItemEntity>,
  ) {}

  async findById(contentId: string): Promise<ContentItemReadModel | null> {
    const entity = await this.repository.findOne({ where: { contentId } });
    return entity ? this.toReadModel(entity) : null;
  }

  async findByHash(hash: ContentHash): Promise<ContentItemReadModel | null> {
    const entity = await this.repository.findOne({
      where: { contentHash: hash.toString() },
    });
    return entity ? this.toReadModel(entity) : null;
  }

  async findBySource(
    sourceId: string,
    limit: number,
  ): Promise<ContentItemReadModel[]> {
    const entities = await this.repository.find({
      where: { sourceId },
      take: limit,
      order: { collectedAt: 'DESC' },
    });
    return entities.map((e) => this.toReadModel(e));
  }

  private toReadModel(entity: ContentItemEntity): ContentItemReadModel {
    return {
      contentId: entity.contentId,
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
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
