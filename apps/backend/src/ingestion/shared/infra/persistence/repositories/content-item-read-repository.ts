import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IContentItemReadRepository } from '@/ingestion/shared/domain/interfaces/repositories/content-item-read-repository';
import { ContentItemReadModel } from '@/ingestion/shared/domain/read-models/content-item-read-model';
import { ContentItemReadModelEntity } from '../entities/content-item-read-model.entity';

/**
 * TypeORM implementation of IContentItemReadRepository
 * Provides optimized read operations for content item queries
 */
@Injectable()
export class TypeOrmContentItemReadRepository implements IContentItemReadRepository {
  constructor(
    @InjectRepository(ContentItemReadModelEntity)
    private readonly repository: Repository<ContentItemReadModelEntity>,
  ) {}

  async findById(contentId: string): Promise<ContentItemReadModel | null> {
    const entity = await this.repository.findOne({
      where: { contentId },
    });

    if (!entity) {
      return null;
    }

    return this.toDomainModel(entity);
  }

  async findByHash(contentHash: string): Promise<ContentItemReadModel | null> {
    const entity = await this.repository.findOne({
      where: { contentHash },
    });

    if (!entity) {
      return null;
    }

    return this.toDomainModel(entity);
  }

  async findBySourceId(sourceId: string): Promise<ContentItemReadModel[]> {
    const entities = await this.repository.find({
      where: { sourceId },
      order: { collectedAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomainModel(entity));
  }

  /**
   * Convert TypeORM entity to domain read model
   */
  private toDomainModel(
    entity: ContentItemReadModelEntity,
  ): ContentItemReadModel {
    return {
      contentId: entity.contentId,
      sourceId: entity.sourceId,
      contentHash: entity.contentHash,
      normalizedContent: entity.normalizedContent,
      metadata: {
        title: entity.metadata.title,
        author: entity.metadata.author,
        publishedAt: entity.metadata.publishedAt
          ? new Date(entity.metadata.publishedAt)
          : undefined,
        language: entity.metadata.language,
        sourceUrl: entity.metadata.sourceUrl,
      },
      assetTags: entity.assetTags,
      collectedAt: entity.collectedAt,
    };
  }
}
